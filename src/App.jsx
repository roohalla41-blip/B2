import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { LayoutVersionProvider } from '@/lib/LayoutVersionContext';
import { LanguageProvider } from '@/lib/i18n';
import { UpgradeProvider } from '@/lib/UpgradeContext';
import { ThemeProvider } from 'next-themes';
import ScrollToTop from './components/ScrollToTop';
import AppGate from '@/components/AppGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import FeatureGate from '@/components/FeatureGate';
import RouteTransition from '@/components/RouteTransition';

// ── Recover from stale/missing split chunks without causing endless reloads ──
const CHUNK_RETRY_KEY = 'app-chunk-retry-at';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError|Unable to preload CSS/i.test(message);
}

function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      if (isChunkLoadError(error)) {
        // Retry once per 30-second window. sessionStorage can be unavailable in
        // private browsing, so storage failures must never hide the real error.
        let lastRetryAt = 0;
        try {
          lastRetryAt = Number(sessionStorage.getItem(CHUNK_RETRY_KEY) || 0);
        } catch { /* storage is optional */ }

        if (Date.now() - lastRetryAt > 30000) {
          try {
            sessionStorage.setItem(CHUNK_RETRY_KEY, String(Date.now()));
          } catch { /* storage is optional */ }
          window.location.reload();
        }
      }
      throw error;
    })
  );
}

// ── Lazy-loaded page imports for code-splitting & mobile performance ──
const Welcome = lazyWithRetry(() => import('@/pages/Welcome'));
const Login = lazyWithRetry(() => import('@/pages/Login'));
const Register = lazyWithRetry(() => import('@/pages/Register'));
const ForgotPassword = lazyWithRetry(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'));
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
const Customers = lazyWithRetry(() => import('@/pages/Customers'));
const CustomerDetail = lazyWithRetry(() => import('@/pages/CustomerDetail'));
const Dadogereft = lazyWithRetry(() => import('@/pages/Dadogereft'));
const Trade = lazyWithRetry(() => import('@/pages/Trade'));
const Transfer = lazyWithRetry(() => import('@/pages/Transfer'));
const Cash = lazyWithRetry(() => import('@/pages/Cash'));
const Bank = lazyWithRetry(() => import('@/pages/Bank'));
const Currencies = lazyWithRetry(() => import('@/pages/Currencies'));
const Reports = lazyWithRetry(() => import('@/pages/Reports'));
const ProfitLoss = lazyWithRetry(() => import('@/pages/ProfitLoss'));
const Settings = lazyWithRetry(() => import('@/pages/Settings'));
const MainSettings = lazyWithRetry(() => import('@/pages/MainSettings'));
const Agents = lazyWithRetry(() => import('@/pages/Agents'));
const Debtors = lazyWithRetry(() => import('@/pages/Debtors'));
const Notifications = lazyWithRetry(() => import('@/pages/Notifications'));
const AgencyNetwork = lazyWithRetry(() => import('@/pages/AgencyNetwork'));
const AgencyChooser = lazyWithRetry(() => import('@/pages/AgencyChooser'));
const ChatGroups = lazyWithRetry(() => import('@/pages/ChatGroups'));
const ChatGroupDetail = lazyWithRetry(() => import('@/pages/ChatGroupDetail'));
const SarraafMarket = lazyWithRetry(() => import('@/pages/SarraafMarket'));
const SarraafChat = lazyWithRetry(() => import('@/pages/SarraafChat'));
const Backup = lazyWithRetry(() => import('@/pages/Backup'));
const CustomerChat = lazyWithRetry(() => import('@/pages/CustomerChat'));
const TransferBook = lazyWithRetry(() => import('@/pages/TransferBook'));
const Journal = lazyWithRetry(() => import('@/pages/Journal'));
const GeneralLedger = lazyWithRetry(() => import('@/pages/GeneralLedger'));
const JournalEntry = lazyWithRetry(() => import('@/pages/JournalEntry'));
const BalanceSheet = lazyWithRetry(() => import('@/pages/BalanceSheet'));
const Reconciliation = lazyWithRetry(() => import('@/pages/Reconciliation'));
const CurrencyConvert = lazyWithRetry(() => import('@/pages/CurrencyConvert'));
const OnlineProducts = lazyWithRetry(() => import('@/pages/OnlineProducts'));
const PaymentGateway = lazyWithRetry(() => import('@/pages/PaymentGateway'));
const SarraafWallet = lazyWithRetry(() => import('@/pages/sarraaf/SarraafWallet'));
const SarraafRecharge = lazyWithRetry(() => import('@/pages/sarraaf/SarraafRecharge'));
const SarraafGames = lazyWithRetry(() => import('@/pages/sarraaf/SarraafGames'));
const BuilderPanel = lazyWithRetry(() => import('@/pages/BuilderPanel'));
const SarraafSupport = lazyWithRetry(() => import('@/pages/SarraafSupport'));
const Assistant = lazyWithRetry(() => import('@/pages/Assistant'));
const CustomerLayout = lazyWithRetry(() => import('@/components/CustomerLayout'));
const CustomerHome = lazyWithRetry(() => import('@/pages/customer/CustomerHome'));
const CustomerWallet = lazyWithRetry(() => import('@/pages/customer/CustomerWallet'));
const CustomerRecharge = lazyWithRetry(() => import('@/pages/customer/CustomerRecharge'));
const CustomerAfghan5 = lazyWithRetry(() => import('@/pages/customer/CustomerAfghan5'));
const CustomerShop = lazyWithRetry(() => import('@/pages/customer/CustomerShop'));
const SellerPanel = lazyWithRetry(() => import('@/pages/seller/SellerPanel'));
const CustomerGames = lazyWithRetry(() => import('@/pages/customer/CustomerGames'));
const CustomerTransfer = lazyWithRetry(() => import('@/pages/customer/CustomerTransfer'));
const CustomerWithdraw = lazyWithRetry(() => import('@/pages/customer/CustomerWithdraw'));
const CustomerSupport = lazyWithRetry(() => import('@/pages/customer/CustomerSupport'));
const CustomerAccount = lazyWithRetry(() => import('@/pages/customer/CustomerAccount'));
const CustomerOrders = lazyWithRetry(() => import('@/pages/customer/CustomerOrders'));
const CustomerMessages = lazyWithRetry(() => import('@/pages/customer/CustomerMessages'));
const CustomerNotifications = lazyWithRetry(() => import('@/pages/customer/CustomerNotifications'));
const CustomerProfile = lazyWithRetry(() => import('@/pages/customer/CustomerProfile'));
const Receipt = lazyWithRetry(() => import('@/pages/Receipt'));
const PageNotFound = lazyWithRetry(() => import('@/lib/PageNotFound'));
const SetupDatabase = lazyWithRetry(() => import('@/pages/SetupDatabase'));
// Layout
const Layout = lazyWithRetry(() => import('@/components/sarraaf/Layout'));

// ── Page loader fallback ──
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const AppRoutes = () => {
  return (
    <RouteTransition>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route path="/setup-database" element={<SetupDatabase />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public AI assistant route; homepage opens the same chat in a modal */}
        <Route path="/assistant" element={<FeatureGate featureKey="assistant"><Assistant /></FeatureGate>} />

        {/* Sarraaf Panel — gated by auth + role */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} allowedRoles={['creator', 'admin', 'sarraaf', 'employee']} />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/dadogereft" element={<Dadogereft />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/transfers/:direction" element={<Transfer />} />
            <Route path="/cash" element={<Cash />} />
            <Route path="/bank" element={<Bank />} />
            <Route path="/currencies" element={<Currencies />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profit-loss" element={<ProfitLoss />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/transfer-book" element={<TransferBook />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/general-ledger" element={<GeneralLedger />} />
            <Route path="/journal-entry" element={<JournalEntry />} />
            <Route path="/balance-sheet" element={<FeatureGate featureKey="balance_sheet"><BalanceSheet /></FeatureGate>} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/convert" element={<CurrencyConvert />} />
            <Route path="/online-products" element={<OnlineProducts />} />
            <Route path="/payment-gateway" element={<FeatureGate featureKey="payment_gateway"><PaymentGateway /></FeatureGate>} />
            <Route path="/online-products/wallet" element={<SarraafWallet />} />
            <Route path="/online-products/recharge" element={<FeatureGate featureKey="mobile_recharge"><SarraafRecharge /></FeatureGate>} />
            <Route path="/online-products/games" element={<FeatureGate featureKey="pubg_uc"><SarraafGames /></FeatureGate>} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/debtors" element={<Debtors />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/agency-network" element={<AgencyNetwork />} />
            <Route path="/agency" element={<AgencyChooser />} />
            <Route path="/chat" element={<ChatGroups />} />
            <Route path="/chat/group/:id" element={<ChatGroupDetail />} />
            <Route path="/sarraaf-market" element={<SarraafMarket />} />
            <Route path="/sarraaf-chat" element={<SarraafChat />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/support" element={<SarraafSupport />} />
          </Route>
        </Route>

        {/* Builder Panel — creator + admin + co-creators */}
        <Route element={<AdminRoute />}>
          <Route path="/builder" element={<BuilderPanel />} />
          <Route path="/main-settings" element={<MainSettings />} />
        </Route>

        {/* Customer Panel */}
        <Route element={<ProtectedRoute requiredRole="customer" unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<CustomerLayout />}>
            <Route path="/customer" element={<CustomerHome />} />
            <Route path="/customer/wallet" element={<CustomerWallet />} />
            <Route path="/customer/recharge" element={<FeatureGate featureKey="mobile_recharge"><CustomerRecharge /></FeatureGate>} />
            <Route path="/customer/afghan5" element={<CustomerAfghan5 />} />
            <Route path="/customer/shop" element={<CustomerShop />} />
            <Route path="/customer/games" element={<FeatureGate featureKey="pubg_uc"><CustomerGames /></FeatureGate>} />
            <Route path="/customer/transfer" element={<CustomerTransfer />} />
            <Route path="/customer/withdraw" element={<CustomerWithdraw />} />
            <Route path="/customer/support" element={<CustomerSupport />} />
            <Route path="/customer/account" element={<CustomerAccount />} />
            <Route path="/customer/orders" element={<CustomerOrders />} />
            <Route path="/customer/messages" element={<CustomerMessages />} />
            <Route path="/customer/notifications" element={<CustomerNotifications />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/customer/chat" element={<CustomerChat />} />
          </Route>
        </Route>

        {/* Seller Panel — any authenticated user (component checks seller access) */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/seller" element={<SellerPanel />} />
        </Route>

        {/* Receipt — any authenticated user */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/receipt" element={<Receipt />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </RouteTransition>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <LayoutVersionProvider>
          <LanguageProvider>
            <QueryClientProvider client={queryClientInstance}>
              <UpgradeProvider>
                <Router>
                  <ScrollToTop />
                  <ErrorBoundary>
                    <AppGate>
                      <AppRoutes />
                    </AppGate>
                  </ErrorBoundary>
                </Router>
                <Toaster />
              </UpgradeProvider>
            </QueryClientProvider>
          </LanguageProvider>
          </LayoutVersionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App