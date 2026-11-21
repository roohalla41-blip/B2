# Hesab Sarraf — Android APK

- Target artifact: signed APK
- Existing build location in B2: Android Gradle project at repository root
- Existing workflow: `.github/workflows/build-apk.yml`
- Existing Android secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- Rule: preserve these secrets and the current keystore; do not regenerate or replace them.
- Output naming currently used by workflow: `Hesab-Sarraf-1.0.1.apk`
- Status: existing build workflow and Android signing configuration are present; this profile documents the target and does not claim a fresh APK was built in this commit.
