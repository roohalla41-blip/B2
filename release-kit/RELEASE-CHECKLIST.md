# Release Acceptance Checklist

For each of the four targets, verify all items before publishing.

## Common
- [ ] Correct application source and product identity
- [ ] Independent version and artifact name
- [ ] No secrets, private keys, or local environment files in artifact/source
- [ ] Build completes from a clean GitHub Actions runner
- [ ] Artifact is uploaded and downloadable
- [ ] Installation and first launch tested on a clean target device

## Android
- [ ] Unique applicationId per app
- [ ] APK signature verifies successfully
- [ ] Signing key matches the app's previous release key when updating an existing installation
- [ ] VersionCode increases monotonically
- [ ] Permissions and app label/icon checked

## Windows
- [ ] Installer built from the real application source
- [ ] Install, launch, upgrade, and uninstall tested
- [ ] Authenticode signature verifies if a certificate is configured
- [ ] Publisher identity and timestamp checked
- [ ] Unsigned builds are clearly marked as unsigned test builds
