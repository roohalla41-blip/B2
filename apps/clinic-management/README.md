# مدیریت مطب — برنامه مستقل اندروید

این برنامه از حساب صراف کاملاً مستقل است.

## مسیرها
- سورس و پروژه اندروید: `apps/clinic-management/android/`
- تنظیمات برنامه: `apps/clinic-management/app-config.json`
- خروجی‌های انتشار: `Clinic-Management-v<version>.apk` در GitHub Actions Artifact

## شناسه و امضای مستقل
- Android applicationId: `com.madar.clinicmanagement`
- Keystore file در زمان build: `clinic-release.keystore`
- Secrets موردنیاز در مخزن B2: `CLINIC_KEYSTORE_BASE64`, `CLINIC_KEYSTORE_PASSWORD`, `CLINIC_KEY_ALIAS`, `CLINIC_KEY_PASSWORD`

هیچ‌یک از متغیرهای امضای حساب صراف از این workflow خوانده نمی‌شود. Keystore و رمزها نباید در Git commit شوند.

## وضعیت فعلی
این پوشه فقط زیرساخت و قرارداد ساخت را دارد؛ سورس واقعی برنامه مدیریت مطب هنوز باید در مسیر Android قرار بگیرد. تا آن زمان workflow عمداً build را با پیام روشن متوقف می‌کند.
