# حساب صراف — Android build path

This is an isolated copy of the existing B2 Android wrapper, placed under its own app directory on this feature branch. The original root-level B2 project and its existing workflow remain untouched.

- Android project: `apps/hesab-sarraf/android/`
- Package ID: `com.hesabsarraf.app` (preserved)
- Existing B2 signing secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- Output artifact: `Hesab-Sarraf-v<version>.apk`

Do not replace or regenerate the existing account-sarraf keystore. The separate clinic workflow uses only `CLINIC_*` secrets.
