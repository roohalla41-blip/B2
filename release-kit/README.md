# Release Kit

This repository is being prepared as a repeatable release workspace for two separate products.

## Products and targets
- Hesab Sarraf / Android APK
- Hesab Sarraf / Windows installer
- Clinic Management / Android APK
- Clinic Management / Windows installer

## Non-negotiable isolation rules
- Never combine the two applications into one Android package or Windows installer.
- Each target has its own release workflow and output name.
- Preserve the existing Hesab Sarraf Android package ID and signing setup.
- Never overwrite or regenerate the existing Android keystore.
- Android signing and Windows Authenticode signing are separate systems.
- Never store private signing material in Git.
- Do not connect this release workspace to the live A1 Supabase project.

## Current source reality
The repository currently contains the Hesab Sarraf Android wrapper project at the repository root. The other application source and Windows packaging projects are not yet present here. The folders under `apps/` are import targets, not fabricated application source code.

## Build readiness
A target is build-ready only after its real source project, build toolchain, app identifier, version policy, and signing requirements are validated. A placeholder folder is not a runnable application.
