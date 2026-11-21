# Release Profiles — Two Independent Applications

This directory records the four independent release targets. It is a handoff specification, not a build workflow and not a claim that release artifacts already exist.

## Targets
1. Hesab Sarraf — Android APK
2. Hesab Sarraf — Windows installer
3. Clinic Management — Android APK
4. Clinic Management — Windows installer

## Separation
- Keep the two applications' source code, package identifiers, app data, branding, and release artifacts separate.
- Keep one GitHub Actions workflow per target.
- The Android signing key is only for Android APK signing. Preserve the existing Android keystore and secrets unchanged.
- Windows Authenticode signing requires a separate Windows code-signing certificate/provider. An Android keystore cannot sign Windows installers.
- Never commit private keys, keystores, passwords, PFX files, or tokens.

## What is still needed before executable workflows can be finalized
- The exported source repository and source directory for each application.
- The exact Android/Windows packaging technology and build commands for each source.
- For public Windows signing, the chosen certificate provider and its supported GitHub Actions/HSM signing interface.

The existing B2 repository currently contains the Hesab Sarraf Android wrapper/build setup. The other three targets must not be represented as build-ready until their source and packaging details are present.
