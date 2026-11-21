# مدیریت مطب — برنامه مستقل اندروید

این برنامه کاملاً مستقل از حساب صراف است.

- سورس اندروید: `apps/clinic-management/android/`
- تنظیمات: `apps/clinic-management/app-config.json`
- شناسه پیشنهادی فعلی: `com.madar.clinicmanagement`؛ اگر برنامه قبلاً منتشر شده، باید applicationId اصلی آن حفظ شود.
- فایل خروجی: `Clinic-Management-v<version>.apk`

## کلید امضای مخصوص مطب

فقط این چهار GitHub Actions Secret برای این برنامه استفاده می‌شوند:

- `CLINIC_KEYSTORE_BASE64`
- `CLINIC_KEYSTORE_PASSWORD`
- `CLINIC_KEY_ALIAS`
- `CLINIC_KEY_PASSWORD`

این مقادیر از Secrets حساب صراف خوانده نمی‌شوند. Keystore باید یک‌بار ایجاد و پشتیبان امن آن نگهداری شود؛ در هر build همان کلید ثابت استفاده می‌شود. کلید یا رمز را داخل Git یا فایل‌های پروژه قرار ندهید.

## وضعیت سورس

در حال حاضر فقط مسیر مستقل و قرارداد ساخت آماده شده است. پروژه کامل Android مدیریت مطب هنوز در این پوشه قرار نگرفته؛ به همین دلیل اجرای build مطب تا اضافه‌شدن سورس کامل عمداً متوقف می‌شود.
