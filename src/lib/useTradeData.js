import { useCustomers, useCurrencies, useBankAccounts, useAgents, usePostDocument } from '@/lib/useSarraaf';

/**
 * useTradeData — مرکز داده‌های معامله (خرید/فروش)
 * تمام متغیرهای ناهمگام و ساختارهای مرتبط در این اسکوپ تعریف می‌شوند
 * تا از تداخل state و مدیریت نادرست داده‌ها در Trade.jsx جلوگیری شود.
 */
export function useTradeData() {
  const customersQuery = useCustomers();
  const currenciesQuery = useCurrencies();
  const bankAccountsQuery = useBankAccounts();
  const agentsQuery = useAgents();
  const postMut = usePostDocument();

  const customers = customersQuery.data || [];
  const currencies = currenciesQuery.data || [];
  const bankAccounts = bankAccountsQuery.data || [];
  const agents = agentsQuery.data || [];

  const isLoading =
    customersQuery.isLoading ||
    currenciesQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    agentsQuery.isLoading;

  const error =
    customersQuery.error ||
    currenciesQuery.error ||
    bankAccountsQuery.error ||
    agentsQuery.error ||
    null;

  return {
    customers,
    currencies,
    bankAccounts,
    agents,
    isLoading,
    error,
    postMut,
  };
}