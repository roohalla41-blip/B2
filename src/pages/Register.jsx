import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SarraafLogo from '@/components/SarraafLogo';
import EmailVerificationStep from '@/components/EmailVerificationStep';
import { directRegisterExchange, directRegisterCustomer } from '@/lib/directAuth';
import { isValidEmailFormat, isRealEmailProvider, signUpSarraaf, getVerificationErrorMessage, markCodeSent } from '@/lib/emailVerification';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { HOME_BY_ROLE } from '@/lib/rbac';
import { Store, User, UserCircle, Phone, Lock, Mail, MapPin, Gift, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Register() {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const VALID_TABS = ['sarraaf', 'customer', 'google'];
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return VALID_TABS.includes(t) ? t : 'sarraaf';
  });

  // Shared fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [emailRole, setEmailRole] = useState(null);

  // Sarraaf-only fields
  const [exchangeName, setExchangeName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user) {
      const home = HOME_BY_ROLE[user.role] || '/';
      window.location.href = home;
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  useEffect(() => {
    if (tab === 'google') {
      const urlEmail = searchParams.get('email');
      const urlName = searchParams.get('name');
      if (urlEmail) setEmail(urlEmail);
      if (urlName) setFullName(urlName);
    }
  }, [tab]);

  const emailValid = isValidEmailFormat(email) && isRealEmailProvider(email);
  // ثبت‌نام صراف بدون مرحلهٔ تأیید ایمیل انجام می‌شود.
  const SKIP_SARRAAF_EMAIL_VERIFICATION = true;

  const validate = () => {
    if (!fullName.trim()) return 'نام و نام خانوادگی الزامی است';
    if (!mobile.trim()) return 'شماره موبایل الزامی است';
    if (!username.trim()) return 'نام کاربری الزامی است';
    if (password.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    if (password !== confirmPassword) return 'تکرار رمز مطابقت ندارد';
    const isSarraafForm = tab === 'sarraaf' || (tab === 'google' && emailRole === 'sarraaf');
    if (isSarraafForm) {
      if (!exchangeName.trim()) return 'نام صرافی الزامی است';
      if (!SKIP_SARRAAF_EMAIL_VERIFICATION && !email.trim()) return 'ایمیل الزامی است';
      if (email.trim() && !emailValid) return 'ایمیل نامعتبر است';
    }
    return null;
  };

  const handleSendOtp = async () => {
    if (!emailValid) { setError('ایمیل نامعتبر است'); return; }
    setError('');
    setOtpSending(true);
    try {
      const res = await signUpSarraaf(email.trim(), password, fullName.trim());
      if (!res.success) { setError(getVerificationErrorMessage(res.error, res.detail)); return; }
      markCodeSent(email.trim());
      setOtpPending(true);
    } catch (err) {
      setError(err.message || 'خطا در ارسال کد');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSarraafSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError('');

    // Google tab: user already verified via Supabase Auth OAuth
    if (tab === 'google') {
      await completeSarraafRegistration(true);
      return;
    }

    // Sarraaf tab: بدون تأیید ایمیل مستقیماً ثبت می‌شود.
    if (SKIP_SARRAAF_EMAIL_VERIFICATION) {
      await completeSarraafRegistration(true);
      return;
    }

    // حالت تأیید ایمیل (غیرفعال): باید ابتدا ایمیل تأیید شود.
    if (!emailVerified) { setError('ابتدا ایمیل خود را تأیید کنید'); return; }
    await completeSarraafRegistration(true);
  };

  const completeSarraafRegistration = async (skipEmailVerification = false) => {
    setLoading(true);
    try {
      const res = await directRegisterExchange({
        exchange_name: exchangeName.trim(),
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        username: username.trim(),
        password,
        email: email.trim(),
        country: country.trim(),
        city: city.trim(),
        exchange_code: inviteCode.trim() || undefined,
      });
      if (!res.success) { setError(errorMsg(res.error)); return; }
      // Store the Supabase Auth access_token — AuthContext reads it on next load
      if (res.token) localStorage.setItem('auth_token', res.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError('');
    setLoading(true);
    try {
      const res = await directRegisterCustomer({
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        username: username.trim(),
        password,
        email: email.trim() || undefined,
      });
      if (!res.success) {
        // Save raw error code (e.g. username_exists) before mapping to message
        setError(errorMsg(res.error));
        return;
      }
      if (res.token) localStorage.setItem('auth_token', res.token);
      window.location.href = '/customer';
    } catch (err) {
      setError(err.message || 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-muted/30 px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4 relative">
            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
            <div className="relative">
              <SarraafLogo size={64} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">
            ثبت‌نام در حساب صراف
          </h1>
          <p className="text-xs text-muted-foreground mt-1">سامانه تخصصی مدیریت صرافی</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          {tab === 'google' ? (
            <div className="w-full">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">ورود با گوگل موفق بود. ایمیل شما:</p>
                <p className="text-sm font-medium text-primary mt-1">{email}</p>
              </div>
              {!emailRole ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">ثبت‌نام به عنوان:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setEmailRole('sarraaf')}>
                      <Store className="w-4 h-4 ml-1" /> صراف
                    </Button>
                    <Button type="button" variant="outline" className="h-11" onClick={() => setEmailRole('customer')}>
                      <UserCircle className="w-4 h-4 ml-1" /> مشتری
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={emailRole === 'sarraaf' ? handleSarraafSubmit : handleCustomerSubmit} className="space-y-3">
                  {emailRole === 'sarraaf' && (
                    <Field icon={Store} label="نام صرافی" value={exchangeName} onChange={setExchangeName} placeholder="نام صرافی" />
                  )}
                  <Field icon={User} label={emailRole === 'sarraaf' ? 'نام و نام خانوادگی مسئول صراف' : 'نام و نام خانوادگی'} required value={fullName} onChange={setFullName} placeholder="نام و نام خانوادگی" />
                  <Field icon={Phone} label="شماره موبایل" required value={mobile} onChange={setMobile} placeholder="07XXXXXXXX" inputMode="tel" />
                  <Field icon={User} label="نام کاربری" required value={username} onChange={setUsername} placeholder="نام کاربری (یکتا)" />
                  <Field icon={Lock} label="رمز عبور" required type="password" value={password} onChange={setPassword} placeholder="حداقل ۸ کاراکتر" />
                  <Field icon={Lock} label="تکرار رمز عبور" required type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="تکرار رمز" />
                  <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    <Mail className="w-4 h-4" />
                    <span>{email}</span>
                    <span className="text-xs text-primary/60">(تأیید شده با گوگل)</span>
                  </div>
                  {emailRole === 'sarraaf' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field icon={MapPin} label="کشور" value={country} onChange={setCountry} placeholder="کشور" />
                        <Field icon={MapPin} label="شهر" value={city} onChange={setCity} placeholder="شهر" />
                      </div>
                      <Field icon={Gift} label="کد دعوت (اختیاری)" value={inviteCode} onChange={setInviteCode} placeholder="کد دعوت صراف/دوست" />
                    </>
                  )}
                  {error && <p className="text-sm text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                    {loading ? 'در حال ثبت...' : `ثبت‌نام ${emailRole === 'sarraaf' ? 'صراف' : 'مشتری'}`}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setEmailRole(null)}>
                    بازگشت به انتخاب نقش
                  </Button>
                </form>
              )}
            </div>
          ) : (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="sarraaf">صراف</TabsTrigger>
              <TabsTrigger value="customer">مشتری</TabsTrigger>
            </TabsList>

            {/* ── تب صراف ── */}
            <TabsContent value="sarraaf">
              <form onSubmit={handleSarraafSubmit} className="space-y-3">
                <Field icon={Store} label="نام صرافی" value={exchangeName} onChange={setExchangeName} placeholder="نام صرافی" />
                <Field icon={User} label="نام و نام خانوادگی مسئول صراف" required value={fullName} onChange={setFullName} placeholder="نام و نام خانوادگی" />
                <Field icon={Phone} label="شماره موبایل" required value={mobile} onChange={setMobile} placeholder="07XXXXXXXX" inputMode="tel" />
                <Field icon={User} label="نام کاربری" required value={username} onChange={setUsername} placeholder="نام کاربری (یکتا)" />
                <Field icon={Lock} label="رمز عبور" required type="password" value={password} onChange={setPassword} placeholder="حداقل ۸ کاراکتر" />
                <Field icon={Lock} label="تکرار رمز عبور" required type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="تکرار رمز" />
                <Field icon={Mail} label="ایمیل (اختیاری)" type="email" value={email} onChange={setEmail} placeholder="email@gmail.com" />

                {emailVerified ? (
                  <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>ایمیل شما تأیید شد</span>
                  </div>
                ) : otpPending ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <EmailVerificationStep
                      email={email.trim()}
                      onVerified={() => { setEmailVerified(true); setOtpPending(false); }}
                      disabled={loading}
                    />
                  </div>
                ) : !SKIP_SARRAAF_EMAIL_VERIFICATION ? (
                  <Button type="button" variant="outline" className="w-full h-10" onClick={handleSendOtp} disabled={!emailValid || otpSending}>
                    {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {otpSending ? 'در حال ارسال کد...' : 'تأیید کد'}
                  </Button>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <Field icon={MapPin} label="کشور" value={country} onChange={setCountry} placeholder="کشور" />
                  <Field icon={MapPin} label="شهر" value={city} onChange={setCity} placeholder="شهر" />
                </div>
                <Field icon={Gift} label="کد دعوت (اختیاری)" value={inviteCode} onChange={setInviteCode} placeholder="کد دعوت صراف/دوست" />

                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full h-11" disabled={loading || (!SKIP_SARRAAF_EMAIL_VERIFICATION && !emailVerified)}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                  {loading ? 'در حال ثبت...' : 'ثبت‌نام صراف'}
                </Button>
              </form>
            </TabsContent>

            {/* ── تب مشتری ── */}
            <TabsContent value="customer">
              <form onSubmit={handleCustomerSubmit} className="space-y-3">
                <Field icon={User} label="نام و نام خانوادگی" required value={fullName} onChange={setFullName} placeholder="نام و نام خانوادگی" />
                <Field icon={Phone} label="شماره موبایل" required value={mobile} onChange={setMobile} placeholder="07XXXXXXXX" inputMode="tel" />
                <Field icon={User} label="نام کاربری" required value={username} onChange={setUsername} placeholder="نام کاربری (یکتا)" />
                <Field icon={Lock} label="رمز عبور" required type="password" value={password} onChange={setPassword} placeholder="حداقل ۸ کاراکتر" />
                <Field icon={Lock} label="تکرار رمز عبور" required type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="تکرار رمز" />
                <Field icon={Mail} label="ایمیل (اختیاری)" type="email" value={email} onChange={setEmail} placeholder="email@gmail.com" />

                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                  {loading ? 'در حال ثبت...' : 'ثبت‌نام مشتری'}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            حساب دارم — ورود
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, required, value, onChange, placeholder, type = 'text', inputMode }) {
  return (
    <div>
      <Label className="mb-1 block text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="pr-9 h-11"
        />
      </div>
    </div>
  );
}

function errorMsg(error) {
  const map = {
    missing_fields: 'لطفاً تمام فیلدهای الزامی را پر کنید',
    mobile_exists: 'این شماره موبایل قبلاً ثبت شده است',
    username_exists: 'این نام کاربری قبلاً گرفته شده است',
    email_not_verified: 'ایمیل شما تأیید نشده است',
    email_exists: 'این ایمیل قبلاً ثبت شده است',
    exchange_code_exists: 'کد دعوت نامعتبر است',
    user_not_found: 'کاربر یافت نشد',
    user_inactive: 'حساب غیرفعال است',
    unauthorized: 'دسترسی غیرمجاز',
    email_confirmation_required: 'لطفاً ایمیل خود را تأیید کنید. یک ایمیل تأیید ارسال شد',
    weak_password: 'رمز عبور ضعیف است. حداقل ۸ کاراکتر استفاده کنید',
    rate_limited: 'تلاش‌های زیاد. لطفاً چند دقیقه صبر کنید',
  };
  if (map[error]) return map[error];
  if (typeof error === 'string' && error.includes('Could not find the function')) {
    return 'سیستم ثبت‌نام در حال به‌روزرسانی است. لطفاً چند دقیقه بعد دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.';
  }
  return error || 'خطا در ثبت‌نام';
}