# راهنمای استقرار تابع legacy-auth

## مشکل
تابع `legacy-auth` در آدرس زیر مستقر نیست و پاسخ `404 NOT_FOUND` برمی‌گرداند:
```
https://tcivyztftnoodobsdxev.supabase.co/functions/v1/legacy-auth
```

## راه‌حل موقت (بدون استقرار تابع)
کد فرانت‌اند به‌روزرسانی شده است تا در صورت در دسترس نبودن تابع:
- **ورود با ایمیل**: مستقیماً از Supabase Auth استفاده می‌کند (برای کاربرانی که حساب `auth.users` دارند)
- **ثبت‌نام**: مستقیماً از Supabase Auth استفاده می‌کند و رکوردها را در جداول `users` و `exchanges` درج می‌کند
- **بازیابی رمز**: مستقل از تابع است و از Supabase Auth استفاده می‌کند
- **دریافت پروفایل**: مستقیماً از جدول `users` خوانده می‌شود

## محدودیت‌های حالت موقت
- ورود با **نام کاربری یا موبایل** کار نمی‌کند (نیازمند تابع برای ترجمه به ایمیل)
- ورود کاربران **قدیمی (legacy)** که حساب `auth.users` ندارند کار نمی‌کند (نیاز به تابع برای تأیید رمز قدیمی و ایجاد حساب)
- کاربران قدیمی می‌توانند از **بازیابی رمز** استفاده کنند تا حساب `auth.users` جدید دریافت کنند

## استقرار کامل تابع

### مرحله ۱: نصب Supabase CLI
```bash
npm install -g supabase
```

### مرحله ۲: ورود به Supabase
```bash
supabase login
```

### مرحله ۳: استقرار تابع
در پوشه پروژه (جایی که `supabase/config.toml` قرار دارد):
```bash
supabase functions deploy legacy-auth --project-ref tcivyztftnoodobsdxev
```

### مرحله ۴: بررسی استقرار
```bash
supabase functions list --project-ref tcivyztftnoodobsdxev
```

### مرحله ۵: تست تابع
```bash
curl -X POST "https://tcivyztftnoodobsdxev.supabase.co/functions/v1/legacy-auth" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"action":"login","identifier":"test","password":"test"}'
```

پاسخ باید `{"success":false,"error":"user_not_found"}` باشد (نه `NOT_FOUND`).

## متغیرهای محیطی مورد نیاز در Supabase
تابع به این متغیرها نیاز دارد (به‌صورت خودکار در Supabase تنظیم می‌شوند):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## بازیابی حساب‌های قدیمی

پس از استقرار تابع، برای بازیابی همهٔ حساب‌های قدیمی:

### مرحله ۱: پشتیبان‌گیری
در Supabase SQL Editor، اسکریپت `public/supabase-recovery-backup.sql` را اجرا کنید
تا از همهٔ جداول اصلی پشتیبان گرفته شود.

### مرحله ۲: بررسی وضعیت
در پنل سازنده (Builder Panel) → تب «سیستم» → بخش «بازیابی حساب‌ها»،
دکمهٔ «بررسی وضعیت» را بزنید تا شمارش کاربران متصل و غیرمتصل نمایش داده شود.

### مرحله ۳: بازیابی حساب‌ها
دکمهٔ «شروع بازیابی» را بزنید. این عملیات:
- برای همهٔ کاربران بدون `auth_uid` حساب Supabase Auth ایجاد می‌کند
- رمزهای فعلی را حفظ می‌کند (رمزهای هش‌شده با رمز پیش‌فرض ایجاد می‌شوند
  اما کاربر می‌تواند با رمز اصلی خود وارد شود — مسیر ورود قدیمی رمز را تأیید و
- حساب را به‌روزرسانی می‌کند)
- عملیات قابل تکرار است و رکوردهای تکراری ایجاد نمی‌کند

### مرحله ۴: پیوند حساب سازنده
در بخش «پیوند حساب سازنده»، ایمیل و رمز عبور سازنده را وارد کنید.
تابع رمز را تأیید کرده و نقش سازنده با دسترسی کامل اعطا می‌کند.
اگر حساب در دیتابیس وجود نداشته باشد و متغیرهای `CREATOR_EMAIL` و
`CREATOR_PASSWORD` در محیط Supabase تنظیم شده باشند، حساب جدید ایجاد می‌شود.

### متغیرهای محیطی اختیاری در Supabase
برای پشتیبانی از ایجاد خودکار حساب سازنده:
- `CREATOR_EMAIL` — ایمیل سازنده
- `CREATOR_PASSWORD` — رمز عبور سازنده

## فایل‌های مرتبط
- `supabase/functions/legacy-auth/index.ts` — کد تابع
- `supabase/config.toml` — تنظیمات (verify_jwt = false)
- `public/supabase-direct-rls.sql` — سیاست‌های RLS اصلی
- `public/supabase-auth-fallback-rls.sql` — سیاست‌های INSERT برای ثبت‌نام مستقیم
- `public/supabase-recovery-backup.sql` — اسکریپت پشتیبان‌گیری قبل از بازیابی

## اجرای SQL
در Supabase SQL Editor، این اسکریپت‌ها را به ترتیب اجرا کنید:
1. `public/supabase-direct-rls.sql` — سیاست‌های اصلی
2. `public/supabase-auth-fallback-rls.sql` — سیاست‌های INSERT (برای ثبت‌نام مستقیم)
