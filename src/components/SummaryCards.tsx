import { ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';
import { Summary } from '../types';
import { formatCurrency } from '../utils';

interface SummaryCardsProps {
  summary: Summary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Entradas</p>
          <h3 className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalIncome)}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
          <ArrowUpCircle className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Saídas</p>
          <h3 className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalExpense)}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
          <ArrowDownCircle className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 shadow-sm flex items-center justify-between text-white">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">Saldo Total</p>
          <h3 className="text-2xl font-semibold">
            {formatCurrency(summary.balance)}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
