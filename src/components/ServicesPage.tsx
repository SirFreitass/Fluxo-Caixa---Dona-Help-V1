import { useState, FormEvent, useEffect } from 'react';
import { ServiceConfig, Transaction, PaymentMethod, PayoutType } from '../types';
import { formatCurrency } from '../utils';
import { Save, PlusCircle } from 'lucide-react';

interface ServicesPageProps {
  services: ServiceConfig[];
  settings: Record<string, string>;
  onUpdateService: (id: string, price: number) => void;
  onUpdateSetting: (key: string, value: string) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export function ServicesPage({ services, settings, onUpdateService, onUpdateSetting, onAddTransaction }: ServicesPageProps) {
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  
  // Launch state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timesPerMonth, setTimesPerMonth] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [simplesNacionalRate, setSimplesNacionalRate] = useState('6');
  const [hasProvider, setHasProvider] = useState(true);
  const [providerPayoutType, setProviderPayoutType] = useState<PayoutType>('percentage');
  const [providerPayoutValue, setProviderPayoutValue] = useState('70');

  useEffect(() => {
    if (settings.simplesNacionalRate) {
      setSimplesNacionalRate(settings.simplesNacionalRate);
    }
  }, [settings.simplesNacionalRate]);

  const handlePriceChange = (id: string, value: string) => {
    setEditingPrices(prev => ({ ...prev, [id]: value }));
  };

  const savePrice = (id: string) => {
    const newPrice = parseFloat(editingPrices[id]);
    if (!isNaN(newPrice)) {
      onUpdateService(id, newPrice);
      setEditingPrices(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSaveSimplesRate = () => {
    onUpdateSetting('simplesNacionalRate', simplesNacionalRate);
    alert('Taxa do Simples Nacional salva com sucesso!');
  };

  const handleLaunchService = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !clientName || !date) return;

    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    let baseAmount = service.defaultPrice;
    let description = `${service.name} - ${clientName}`;
    
    if (service.category === 'mensal') {
      const times = parseInt(timesPerMonth) || 1;
      baseAmount = service.defaultPrice * times;
      description = `${service.name} (${times}x) - ${clientName}`;
    }

    let cardTaxRate = 0;
    if (paymentMethod === 'credit') cardTaxRate = 4.15;
    if (paymentMethod === 'debit') cardTaxRate = 1.99;

    const simplesRate = parseFloat(simplesNacionalRate) || 0;
    const payoutValue = hasProvider ? parseFloat(providerPayoutValue) || 0 : 0;

    let totalDeductions = baseAmount * (simplesRate / 100) + baseAmount * (cardTaxRate / 100);
    
    if (hasProvider) {
       if (providerPayoutType === 'fixed') {
           totalDeductions += payoutValue;
       } else {
           totalDeductions += baseAmount * (payoutValue / 100);
       }
    }

    const netAmount = baseAmount - totalDeductions;

    let category = 'Limpeza Residencial';
    if (service.category === 'mensal') category = 'Limpeza Comercial'; // or Mensal
    if (service.category === 'pos-obra') category = 'Pós-obra';

    onAddTransaction({
      type: 'income',
      description,
      amount: baseAmount,
      date,
      category,
      paymentMethod,
      simplesNacionalRate: simplesRate,
      cardTaxRate,
      providerPayoutType,
      providerPayoutValue: payoutValue,
      netAmount,
    });

    // Reset form
    setClientName('');
    setSelectedServiceId('');
    alert('Serviço lançado e integrado ao fluxo de caixa com sucesso!');
  };

  const renderServiceGroup = (title: string, category: string) => {
    const groupServices = services.filter(s => s.category === category);
    if (groupServices.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">{title}</h4>
        <div className="space-y-3">
          {groupServices.map(service => (
            <div key={service.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-sm text-gray-700">{service.name}</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={editingPrices[service.id] !== undefined ? editingPrices[service.id] : service.defaultPrice}
                    onChange={(e) => handlePriceChange(service.id, e.target.value)}
                    className="w-28 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                {editingPrices[service.id] !== undefined && (
                  <button
                    onClick={() => savePrice(service.id)}
                    className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-lg transition-colors"
                    title="Salvar Preço"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Tabela de Preços */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Tabela de Preços</h3>
        
        {renderServiceGroup('Limpeza Residencial', 'residencial')}
        {renderServiceGroup('Limpeza Mensal (Valor por diária)', 'mensal')}
        {renderServiceGroup('Limpeza Pós-Obra', 'pos-obra')}
      </div>

      {/* Lançamento de Serviço */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-indigo-600" />
          Lançar Serviço
        </h3>

        <form onSubmit={handleLaunchService} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serviço
            </label>
            <select
              required
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="">Selecione um serviço...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {formatCurrency(s.defaultPrice)}
                </option>
              ))}
            </select>
          </div>

          {selectedService?.category === 'mensal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vezes ao mês
              </label>
              <input
                type="number"
                required
                min="1"
                value={timesPerMonth}
                onChange={(e) => setTimesPerMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Cliente / Local
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ex: João Silva - Apto 402"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data do Serviço
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Pagamento e Repasses</h4>
            
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Simples Nacional (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={simplesNacionalRate}
                  onChange={(e) => setSimplesNacionalRate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleSaveSimplesRate}
                  className="p-2 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-xl transition-colors"
                  title="Salvar como padrão"
                >
                  <Save className="w-5 h-5" />
                </button>
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
                  Repasse para prestador
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

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all"
          >
            Lançar Serviço
          </button>
        </form>
      </div>
    </div>
  );
}
