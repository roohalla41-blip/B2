// termsService.js — مدیریت قوانین و مقررات برنامه
//
// متن قوانین در AppSetting ذخیره می‌شود (مفتوح‌الخواندن برای همه).
// وضعیت پذیرش هر کاربر در localStorage نگهداری می‌شود.
// وقتی نسخه قوانین تغییر کند، کاربر باید دوباره بپذیرد.

import { createSupabaseEntity } from './supabaseApi';

const AppSetting = createSupabaseEntity('AppSetting');

const TERMS_VERSION_KEY = 'terms_version';
const TERMS_SARRAAF_KEY = 'terms_sarraaf';
const TERMS_CUSTOMER_KEY = 'terms_customer';

const DEFAULT_SARRAAF_TERMS = `قوانین و مقررات استفاده از سامانه حساب صراف

۱. مقدمه
این قوانین شرایط استفاده از سامانه «حساب صراف» را مشخص می‌کند. با ورود به سامانه، شما این قوانین را پذیرفته‌اید.

۲. تعاریف
- «سامانه»: پلتفرم نرم‌افزاری حساب صراف
- «صراف»: کاربر صرافی که از ابزارهای مدیریت عملیات صرافی استفاده می‌کند
- «مشتری»: کاربری که خدمات صرافی (حواله، تبدیل ارز، خرید محصول) دریافت می‌کند

۳. حساب کاربری
- کاربر موظف است اطلاعات صحیح و واقعی هنگام ثبت‌نام ارائه دهد.
- حفظ رمز عبور و اعتبارنامه ورود بر عهده کاربر است.
- هر فعالیت انجام‌شده با حساب کاربر، مسئولیت آن بر عهده صاحب حساب است.

۴. عملیات مالی
- تمام تراکنش‌ها (خرید، فروش، حواله، تبدیل ارز) باید دقیق و با مدارک معتبر ثبت شوند.
- صراف موظف است نرخ ارز روز را پیش از انجام هر معامله به مشتری اعلام کند.
- حواله‌ها باید با اطلاعات کامل گیرنده و مأمور تحویل ثبت شوند.
- ثبت تراکنش‌های ساختگی یا خلاف واقع ممنوع است.

۵. امنیت و محرمانگی
- کاربر نباید حساب کاربری خود را در اختیار دیگران قرار دهد.
- در صورت مشکوک بودن به دسترسی غیرمجاز، فوراً رمز عبور را تغییر دهید.
- داده‌های مالی کاربران محفوظ نگه‌داری می‌شود و با اشخاص ثالث به‌اشتراک گذاشته نمی‌شود.

۶. مسئولیت
- سامانه تنها ابزار نرم‌افزاری ارائه می‌دهد و در تصمیمات مالی کاربر دخالت نمی‌کند.
- مسئولیت صحت تراکنش‌ها و تطابق با قوانین محلی بر عهده صراف است.
- خسارات ناشی از وارد کردن اطلاعات نادرست بر عهده کاربر است.

۷. استفاده مجاز
- استفاده از سامانه فقط برای فعالیت‌های قانونی صرافی مجاز است.
- استفاده برای پولشویی، تقلب یا فعالیت‌های غیرقانونی ممنوع است.
- اسپم، تبلیغات و ارسال پیام‌های ناخواسته ممنوع است.

۸. تغییر قوانین
- مدیریت سامانه حق تغییر این قوانین را محفوظ می‌دارد.
- تغییرات پس از اطلاع‌رسانی لازم اعمال می‌شوند و ادامه استفاده به معنای پذیرش قوانین جدید است.

۹. تعلیق حساب
- در صورت نقض قوانین، مدیریت سامانه می‌تواند حساب کاربر را تعلیق یا مسدود کند.

۱۰. پشتیبانی
- برای هرگونه سوال یا مشکل، از بخش پشتیبانی درون برنامه اقدام کنید.

نسخه ۱.۰ — تاریخ تدوین: ۱۴۰۴`;

const DEFAULT_CUSTOMER_TERMS = `قوانین و مقررات استفاده از خدمات مشتری سامانه حساب صراف

۱. مقدمه
این قوانین شرایط استفاده کاربران مشتری از خدمات سامانه «حساب صراف» را مشخص می‌کند.

۲. ثبت‌نام و حساب کاربری
- مشتری موظف است اطلاعات صحیح هنگام ثبت‌نام ارائه دهد.
- هر شخص فقط یک حساب کاربری می‌تواند داشته باشد.
- حفظ محرمانگی رمز عبور بر عهده مشتری است.

۳. کیف پول و موجودی
- موجودی کیف پول فقط برای استفاده در خدمات صرافی است.
- شارژ کیف پول از طریق روش‌های تعیین‌شده انجام می‌شود.
- برداشت موجودی پس از تأیید صراف انجام می‌شود.

۴. خدمات مالی
- نرخ ارز در زمان ثبت سفارش معتبر است و ممکن است تغییر کند.
- حواله‌ها بر اساس نرخ روز و کارمزد تعیین‌شده محاسبه می‌شوند.
- سفارش‌های محصولات آنلاین پس از پرداخت کامل پردازش می‌شوند.

۵. مسئولیت‌ها
- مشتری موظف است پیش از تأیید تراکنش، جزئیات را بررسی کند.
- مسئولیت صحت اطلاعات گیرنده حواله بر عهده مشتری است.
- در صورت وارد کردن اطلاعات نادرست، سامانه مسئولیتی نمی‌پذیرد.

۶. ممنوعیت‌ها
- استفاده از خدمات برای فعالیت‌های غیرقانونی ممنوع است.
- تلاش برای سوءاستفاده از باگ‌ها یا تقلب ممنوع است.
- حساب کاربری متخلف بدون اطلاع قبلی مسدود می‌شود.

۷. تغییر قوانین
- مدیریت حق تغییر این قوانین را محفوظ می‌دارد.
- ادامه استفاده پس از تغییرات به معنای پذیرش قوانین جدید است.

۸. پشتیبانی
- برای سوالات و مشکلات از بخش پشتیبانی اقدام کنید.

نسخه ۱.۰ — تاریخ تدوین: ۱۴۰۴`;

export async function getTerms() {
  try {
    const settings = await AppSetting.filter({
      key: { $in: [TERMS_VERSION_KEY, TERMS_SARRAAF_KEY, TERMS_CUSTOMER_KEY] },
    });
    const map = {};
    (settings || []).forEach((s) => { map[s.key] = s.value; });
    return {
      version: parseInt(map[TERMS_VERSION_KEY] || '1', 10) || 1,
      sarraaf: map[TERMS_SARRAAF_KEY] || DEFAULT_SARRAAF_TERMS,
      customer: map[TERMS_CUSTOMER_KEY] || DEFAULT_CUSTOMER_TERMS,
    };
  } catch (err) {
    console.error('[termsService] getTerms() failed:', err.message);
    return {
      version: 1,
      sarraaf: DEFAULT_SARRAAF_TERMS,
      customer: DEFAULT_CUSTOMER_TERMS,
    };
  }
}

export function hasAcceptedTerms(userId, version) {
  if (!userId) return false;
  const key = `terms_accepted_v${version}_${userId}`;
  return localStorage.getItem(key) === 'true';
}

export function acceptTerms(userId, version) {
  if (!userId) return;
  const key = `terms_accepted_v${version}_${userId}`;
  localStorage.setItem(key, 'true');
}

export async function upsertSetting(key, value) {
  const existing = await AppSetting.filter({ key });
  if (existing && existing.length > 0) {
    await AppSetting.update(existing[0].id, { value });
  } else {
    await AppSetting.create({ key, value });
  }
}

export async function saveTerms(sarraafText, customerText, currentVersion) {
  const newVersion = (currentVersion || 1) + 1;
  await upsertSetting(TERMS_SARRAAF_KEY, sarraafText);
  await upsertSetting(TERMS_CUSTOMER_KEY, customerText);
  await upsertSetting(TERMS_VERSION_KEY, String(newVersion));
  return newVersion;
}