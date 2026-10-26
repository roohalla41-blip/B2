# راهنمای استقرار احراز هویت مستقیم Supabase

## تغییرات انجام‌شده

سیستم ورود و دسترسی داده از مسیر توابع Base44 (که نیاز به Integration credits داشت) به Supabase Auth مستقل منتقل شده است. هیچ داده‌ای حذف یا تغییر نیافته است.

### فایل‌های جدید
- `supabase/functions/legacy-auth/index.ts` — Edge Function برای بررسی رمزهای قدیمی
- `public/supabase-direct-rls.sql` — سیاست‌های RLS و ستون `auth_uid`
- `src/lib/supabaseDirectAuth.js` — ماژول احراز هویت جدید

### فایل‌های به‌روزرسانی‌شده
- `src/lib/supabaseApi.js` — دسترسی داده مستقیم از Supabase (بدون تابع Base44)
- `src/lib/directAuth.js` — ارجاع به ماژول جدید
- `src/pages/Login.jsx` — پیام‌های خطای جدید
- `src/pages/Register.jsx` — حذف signOut اضافی
- `src/lib/googleAuth.js` — استفاده از Edge Function

## مراحل استقرار

### ۱. اجرای SQL در Supabase

در داشبورد Supabase → SQL Editor، فایل `supabase-direct-rls.sql` را اجرا کنید:

```bash
# محتوای فایل در مسیر:
# public/supabase-direct-rls.sql
```

این کار:
- ستون `auth_uid` را به جدول `users` اضافه می‌کند (بدون حذف داده)
- RLS را روی جدول‌های کلیدی فعال می‌کند
- سیاست‌های جداسازی tenant را تعریف می‌کند

### ۲. استقرار Edge Function

```bash
# نصب Supabase CLI (اگر نصب نیست)
npm install -g supabase

# ورود به Supabase
supabase login

# پیوند پروژه
supabase link --project-ref YOUR_PROJECT_REF

# استقرار Edge Function
supabase functions deploy legacy-auth

# تنظیم متغیرهای محیطی (در داشبورد Supabase → Edge Functions → Configure)
# این متغیرها به‌صورت خودکار در Edge Function موجود هستند:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### ۳. آزمایش

پس از استقرار:
1. کاربران فعلی می‌توانند با رمز فعلی خود وارد شوند (بدون تغییر رمز)
2. کاربران جدید از مسیر Supabase Auth ثبت‌نام می‌کنند
3. دسترسی داده مستقیماً از Supabase انجام می‌شود (بدون Integration credits)

## نحوه کار

### ورود کاربر قدیمی
1. کاربر شناسه و رمز را وارد می‌کند
2. Edge Function رمز را با PBKDF2 بررسی می‌کند
3. اگر صحیح باشد، حساب `auth.users` را ایجاد می‌کند
4. فرانت‌اند با `supabase.auth.signInWithPassword()` وارد می‌شود
5. نشست توسط Supabase Auth مدیریت می‌شود

### دسترسی داده
- تمام عملیات CRUD مستقیماً از `supabase.from(table).select()` و مشابه انجام می‌شود
- RLS دسترسی هر کاربر را به داده‌های مجاز محدود می‌کند
- هیچ وابستگی به Integration credits یا توابع Base44 وجود ندارد

## امنیت

- رمز عبور هرگز در فرانت‌اند ذخیره نمی‌شود
- `service-role key` فقط در Edge Function استفاده می‌شود
- نشست توسط Supabase Auth مدیریت می‌شود (بدون HMAC token سفارشی)
- RLS جداسازی tenant را تضمین می‌کند

## بازگشت

در صورت بروز مشکل:
1. Edge Function را غیرفعال کنید
2. SQL `supabase-direct-rls.sql` را برگردانید (DROP POLICY)
3. کد قبلی از Git قابل بازیابی است

هیچ داده‌ای حذف یا تغییر نیافته است.
