// directAuth.js — delegates to supabaseDirectAuth (no Base44 dependency)
//
// این ماژول اکنون به supabaseDirectAuth.js ارجاع می‌دهد تا احراز هویت
// مستقیماً از طریق Supabase Auth و Edge Function انجام شود.
// هیچ وابستگی به Integration credits یا توابع Base44 ندارد.

export {
  directLogin,
  checkLegacyUser,
  directRegisterCustomer,
  directRegisterExchange,
  creatorCreateExchange,
  directGoogleLogin,
  directLinkGoogleAccount,
  directGetMe,
  directChangePassword,
} from './supabaseDirectAuth';