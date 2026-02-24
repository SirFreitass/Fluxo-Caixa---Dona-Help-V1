import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Transaction } from '../types';

interface ChartProps {
  transactions: Transaction[];
}

export function Chart({ transactions }: ChartProps) {
  // Group transactions by date
  const data = transactions.reduce((acc, curr) => {
    const date = curr.date;
    if (!acc[date]) {
      acc[date] = { date, income: 0, expense: 0 };
    }
    if (curr.type === 'income') {
      acc[date].income += curr.amount;
      
      const simples = curr.amount * ((curr.simplesNacionalRate || 0) / 100);
      const card = curr.amount * ((curr.cardTaxRate || 0) / 100);
      
      let provider = 0;
      if (curr.providerPayoutValue) {
        if (curr.providerPayoutType === 'fixed') {
          provider = curr.providerPayoutValue;
        } else {
          provider = curr.amount * (curr.providerPayoutValue / 100);
        }
      }
      
      acc[date].expense += (simples + card + provider);
    } else {
      acc[date].expense += curr.amount;
    }
    return acc;
  }, {} as Record<string, { date: string; income: number; expense: number }>);

  const chartData = Object.values(data).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm h-80 flex items-center justify-center">
        <p className="text-gray-500">Adicione transações para ver o gráfico.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-80">
      <h3 className="font-semibold text-gray-900 mb-6">Fluxo de Caixa</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip
            cursor={{ fill: '#f9fafb' }}
            contentStyle={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #f3f4f6',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey="income"
            name="Entradas"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="expense"
            name="Saídas"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
