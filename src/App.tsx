import { useState, useEffect } from 'react';
import { Plus, Wallet, Download, LayoutDashboard, Briefcase } from 'lucide-react';
import * as XLSX from 'xlsx';
import { io, Socket } from 'socket.io-client';
import { Transaction, Summary, ServiceConfig } from './types';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { Chart } from './components/Chart';
import { ServicesPage } from './components/ServicesPage';

const socket = io({
  transports: ['websocket', 'polling']
});

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial data immediately
    fetch('/api/transactions', { headers: { 'Cache-Control': 'no-cache' } })
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(err => console.error('Error fetching transactions:', err));
    
    fetch('/api/services', { headers: { 'Cache-Control': 'no-cache' } })
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error('Error fetching services:', err));

    fetch('/api/settings', { headers: { 'Cache-Control': 'no-cache' } })
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Error fetching settings:', err));

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleTransactionAdded = (transaction: Transaction) => {
      setTransactions(prev => {
        if (prev.some(t => t.id === transaction.id)) return prev;
        return [transaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    };

    const handleTransactionDeleted = (id: string) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleServicePriceUpdated = ({ id, price }: { id: string, price: number }) => {
      setServices(prev => prev.map(s => s.id === id ? { ...s, defaultPrice: price } : s));
    };

    const handleSettingUpdated = ({ key, value }: { key: string, value: string }) => {
      setSettings(prev => ({ ...prev, [key]: value }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('transactionAdded', handleTransactionAdded);
    socket.on('transactionDeleted', handleTransactionDeleted);
    socket.on('servicePriceUpdated', handleServicePriceUpdated);
    socket.on('settingUpdated', handleSettingUpdated);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('transactionAdded', handleTransactionAdded);
      socket.off('transactionDeleted', handleTransactionDeleted);
      socket.off('servicePriceUpdated', handleServicePriceUpdated);
      socket.off('settingUpdated', handleSettingUpdated);
    };
  }, []);

  const summary: Summary = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.totalIncome += transaction.amount;
        acc.balance += transaction.amount;
        
        // Deductions
        const simples = transaction.amount * ((transaction.simplesNacionalRate || 0) / 100);
        const card = transaction.amount * ((transaction.cardTaxRate || 0) / 100);
        
        let provider = 0;
        if (transaction.providerPayoutValue) {
          if (transaction.providerPayoutType === 'fixed') {
            provider = transaction.providerPayoutValue;
          } else {
            provider = transaction.amount * (transaction.providerPayoutValue / 100);
          }
        }
        
        const totalDeductions = simples + card + provider;
        acc.totalExpense += totalDeductions;
        acc.balance -= totalDeductions;
      } else {
        acc.totalExpense += transaction.amount;
        acc.balance -= transaction.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, balance: 0 }
  );

  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
    };
    // Optimistic update
    setTransactions(prev => [transaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
    } catch (error) {
      console.error('Failed to save transaction', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    // Optimistic update
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete transaction', error);
    }
  };

  const handleUpdateServicePrice = async (id: string, price: number) => {
    // Optimistic update
    setServices(prev => prev.map(s => s.id === id ? { ...s, defaultPrice: price } : s));
    
    try {
      await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price })
      });
    } catch (error) {
      console.error('Failed to update service price', error);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }));
    
    try {
      await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
    } catch (error) {
      console.error('Failed to update setting', error);
    }
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      alert('Não há transações para exportar.');
      return;
    }

    // Group transactions by month-year
    const groupedTransactions = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    const wb = XLSX.utils.book_new();

    // Create a sheet for each month
    Object.keys(groupedTransactions).sort().forEach(monthYear => {
      const monthTransactions = groupedTransactions[monthYear];
      
      const exportData = monthTransactions.map(t => {
        let providerValue = 0;
        if (t.type === 'income' && t.providerPayoutValue) {
           providerValue = t.providerPayoutType === 'fixed' 
            ? t.providerPayoutValue 
            : t.amount * (t.providerPayoutValue / 100);
        }

        const simplesValue = t.type === 'income' ? t.amount * ((t.simplesNacionalRate || 0) / 100) : 0;
        const cardValue = t.type === 'income' ? t.amount * ((t.cardTaxRate || 0) / 100) : 0;

        return {
          'Data': new Date(t.date).toLocaleDateString('pt-BR'),
          'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
          'Descrição': t.description,
          'Categoria': t.category,
          'Valor Bruto': t.amount,
          'Forma Pagamento': t.paymentMethod || '-',
          'Taxa Cartão (R$)': cardValue,
          'Simples Nacional (R$)': simplesValue,
          'Repasse Prestador (R$)': providerValue,
          'Valor Líquido': t.netAmount || t.amount,
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns
      const colWidths = [
        { wch: 12 }, // Data
        { wch: 10 }, // Tipo
        { wch: 30 }, // Descrição
        { wch: 20 }, // Categoria
        { wch: 15 }, // Valor Bruto
        { wch: 15 }, // Forma Pagamento
        { wch: 15 }, // Taxa Cartão
        { wch: 20 }, // Simples Nacional
        { wch: 20 }, // Repasse
        { wch: 15 }, // Valor Líquido
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, monthYear);
    });

    XLSX.writeFile(wb, 'Controle_de_Fluxo.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block">
              Controle de Fluxo - Dona Help Navegantes
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'services'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Serviços</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'dashboard' && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="hidden sm:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nova Transação
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 sm:pb-8">
        {activeTab === 'dashboard' ? (
          <>
            <SummaryCards summary={summary} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Chart transactions={transactions} />
                <TransactionList
                  transactions={transactions}
                  onDelete={handleDeleteTransaction}
                />
              </div>
              <div className="hidden lg:block">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg sticky top-24">
                  <h3 className="font-semibold text-lg mb-2">Dica Financeira</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                    Mantenha suas despesas fixas abaixo de 50% da sua renda para
                    garantir uma vida financeira saudável e ter espaço para
                    investimentos.
                  </p>
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{
                        width: `${Math.min(
                          (summary.totalExpense / (summary.totalIncome || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-indigo-200 mt-2">
                    Comprometimento da renda:{' '}
                    {summary.totalIncome > 0
                      ? Math.round((summary.totalExpense / summary.totalIncome) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <ServicesPage
            services={services}
            settings={settings}
            onUpdateService={handleUpdateServicePrice}
            onUpdateSetting={handleUpdateSetting}
            onAddTransaction={handleAddTransaction}
          />
        )}
      </main>

      {/* Mobile FABs */}
      {activeTab === 'dashboard' && (
        <div className="sm:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-20">
          <button
            onClick={handleExportExcel}
            className="w-14 h-14 bg-white text-gray-700 border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-transform active:scale-95"
          >
            <Download className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Modal */}
      {isFormOpen && (
        <TransactionForm
          onAdd={handleAddTransaction}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
