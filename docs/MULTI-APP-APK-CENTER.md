# B2 Multi-app APK center

Implementation is isolated on branch `feature/multi-app-apk-center`; the `main` branch and original root B2 workflow remain unchanged.

## Independent app projects and workflows
- Hesab Sarraf Android project: `apps/hesab-sarraf/android/`
- Clinic Management Android project: `apps/clinic-management/android/`
- Dedicated workflow for Sarraf: `.github/workflows/build-hesab-sarraf-apk.yml`
- Dedicated workflow for Clinic: `.github/workflows/build-clinic-management-apk.yml`

Each app has its own manual GitHub Actions workflow, version input, build job, APK artifact, and optional Mother publication job. Each successful APK artifact is retained for 90 days.

## Shared signing identity
Both workflows use the same existing B2 Android signing secrets:
- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

The keystore is restored temporarily during the build and removed at the end. Never commit the keystore or passwords to the repository, and do not regenerate or replace the existing key.

**Compatibility warning:** an already-published Android app must retain its original signing certificate for in-place updates. Before the first Clinic release, confirm whether Clinic has ever been distributed and compare its existing signing-certificate fingerprint with the shared key. If it was previously signed with another key, do not switch it to this shared key for an update release.

## Publish to Mother website
Each app workflow includes an optional **Publish the APK to the Mother website** input. Configure these repository Actions secrets:
- `MOTHER_SUPABASE_URL`
- `MOTHER_SUPABASE_SERVICE_ROLE_KEY`

The workflow uploads the APK to the Supabase Storage bucket `madar-files` and updates the Mother `apps` and `releases` catalog. The bucket must be public for the generated public download URL to work. The service-role key remains only in GitHub Secrets.

## Current readiness
- Sarraf has its isolated Android project and uses the existing B2 signing identity.
- Clinic has a separate workflow and isolated target path, but its complete Android source is not yet present. Its workflow intentionally stops until `apps/clinic-management/android/app/build.gradle` exists.
- Workflow files have been added to this feature branch; a full GitHub Actions build and Mother publication have not yet been run end-to-end.
