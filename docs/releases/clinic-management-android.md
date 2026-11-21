# Clinic Management — Android APK

- Target artifact: separately signed APK
- Source project: independent Clinic Management application; never combine it with Hesab Sarraf
- Workflow: its own GitHub Actions workflow, independent of the Hesab Sarraf APK workflow
- Signing: Android signing configuration must be assigned to this app without overwriting or changing the existing Hesab Sarraf signing secrets or keystore
- Required before implementation: exported Android source repository/path, applicationId/package name, and versioning policy
- Status: release target specified; source/build configuration is not present in the current B2 Android project, so no APK can be built from this profile yet.
