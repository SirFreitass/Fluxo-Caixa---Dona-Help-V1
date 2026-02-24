import { useState, FormEvent } from 'react';
import { Transaction, TransactionType, PaymentMethod, PayoutType } from '../types';
import { X } from 'lucide-react';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const CATEGORIES = {
  income: ['Limpeza Residencial', 'Limpeza Comercial', 'Pós-obra', 'Outros'],
  expense: ['Produtos de Limpeza', 'Equipamentos', 'Transporte', 'Alimentação', 'Impostos', 'Outros'],
};

export function TransactionForm({ onAdd, onClose }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('income');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES.income[0]);

  // New fields for income
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [simplesNacionalRate, setSimplesNacionalRate] = useState('6');
  const [hasProvider, setHasProvider] = useState(true);
  const [providerPayoutType, setProviderPayoutType] = useState<PayoutType>('percentage');
  const [providerPayoutValue, setProviderPayoutValue] = useState('70');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !category) return;

    const numAmount = parseFloat(amount);
    let cardTaxRate = 0;
    if (type === 'income') {
      if (paymentMethod === 'credit') cardTaxRate = 4.15;
      if (paymentMethod === 'debit') cardTaxRate = 1.99;
    }

    const simplesRate = type === 'income' ? parseFloat(simplesNacionalRate) || 0 : 0;
    const payoutValue = type === 'income' && hasProvider ? parseFloat(providerPayoutValue) || 0 : 0;

    let totalDeductions = numAmount * (simplesRate / 100) + numAmount * (cardTaxRate / 100);
    
    if (type === 'income' && hasProvider) {
       if (providerPayoutType === 'fixed') {
           totalDeductions += payoutValue;
       } else {
           totalDeductions += numAmount * (payoutValue / 100);
       }
    }

    const netAmount = type === 'income' ? numAmount - totalDeductions : numAmount;

    onAdd({
      type,
      description,
      amount: numAmount,
      date,
      category,
      ...(type === 'income' && {
        paymentMethod,
        simplesNacionalRate: simplesRate,
        cardTaxRate,
        providerPayoutType,
        providerPayoutValue: payoutValue,
        netAmount,
      }),
    });
    onClose();
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(CATEGORIES[newType][0]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">Nova Transação</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                type === 'expense'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Saída
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder={type === 'income' ? 'Ex: Limpeza Residencial - Cliente A' : 'Ex: Produtos de Limpeza'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor {type === 'income' ? 'Bruto' : ''} (R$)
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                {CATEGORIES[type].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {type === 'income' && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Deduções e Repasses</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  >
                    <option value="pix">Pix / Transferência (0%)</option>
                    <option value="money">Dinheiro (0%)</option>
                    <option value="credit">Cartão de Crédito (4,15%)</option>
                    <option value="debit">Cartão de Débito (1,99%)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Simples Nacional (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={simplesNacionalRate}
                      onChange={(e) => setSimplesNacionalRate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasProvider}
                      onChange={(e) => setHasProvider(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Houve repasse para prestador?
                    </span>
                  </label>
                  
                  {hasProvider && (
                    <div className="space-y-3">
                      <div className="flex gap-4 p-1 bg-gray-200/50 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setProviderPayoutType('percentage')}
                          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                            providerPayoutType === 'percentage'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Porcentagem (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setProviderPayoutType('fixed')}
                          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                            providerPayoutType === 'fixed'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Valor Fixo (R$)
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {providerPayoutType === 'percentage' ? 'Porcentagem do Repasse (%)' : 'Valor do Repasse (R$)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={providerPayoutType === 'percentage' ? "100" : undefined}
                          step={providerPayoutType === 'percentage' ? "1" : "0.01"}
                          value={providerPayoutValue}
                          onChange={(e) => setProviderPayoutValue(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all"
            >
              Adicionar Transação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
