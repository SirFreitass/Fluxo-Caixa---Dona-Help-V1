export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'pix' | 'money' | 'credit' | 'debit';
export type PayoutType = 'percentage' | 'fixed';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  
  paymentMethod?: PaymentMethod;
  simplesNacionalRate?: number;
  cardTaxRate?: number;
  providerPayoutType?: PayoutType;
  providerPayoutValue?: number;
  netAmount?: number;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export type ServiceCategory = 'residencial' | 'mensal' | 'pos-obra';

export interface ServiceConfig {
  id: string;
  category: ServiceCategory;
  name: string;
  defaultPrice: number;
}
