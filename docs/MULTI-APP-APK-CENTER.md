# B2 Multi-app APK center

Implementation is isolated on branch `feature/multi-app-apk-center`; the `main` branch and original root B2 workflow remain unchanged.

## Separate app paths
- `apps/hesab-sarraf/android/`: isolated copy of the existing account-sarraf Android wrapper. The package ID and existing B2 signing credentials are preserved.
- `apps/clinic-management/android/`: separate Android project path for the clinic app. Its signing namespace is `CLINIC_*` only.
- `apps/<new-slug>/`: reserved pattern for each future app.

## Build and download
Run GitHub Actions workflow **Multi-app Android release center**, select the app and version. Each successful build uploads a named APK Artifact, downloadable from that workflow run for 90 days.

## Signing separation
Sarraf uses only the existing B2 secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.

Clinic uses only `CLINIC_KEYSTORE_BASE64`, `CLINIC_KEYSTORE_PASSWORD`, `CLINIC_KEY_ALIAS`, `CLINIC_KEY_PASSWORD`. The two applications build in separate jobs, and each job receives only its own signing secrets.

## Publish to Mother website
Enable **Publish the APK to the Mother website** in the workflow. The publish job uploads the APK to the Mother Supabase Storage bucket `madar-files`, then updates the `apps` and `releases` catalog records. Configure these two repository Actions secrets first:
- `MOTHER_SUPABASE_URL`
- `MOTHER_SUPABASE_SERVICE_ROLE_KEY`

The `madar-files` bucket must be public for the resulting public download URL to work. The service-role key remains only in GitHub Secrets.

## Clinic app still needs two things
The complete clinic Android source has not yet been placed under `apps/clinic-management/android/`, and the dedicated clinic keystore has not yet been created or registered in GitHub Secrets. If the clinic app has ever been released, its existing applicationId and signing key must be preserved; do not replace them with a new key.
