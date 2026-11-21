# Independent Android apps registry

Every application owns its own source, Android project, configuration, assets, release folder and signing identity.

## Registered application paths

- `clinic-management/`: clinic-management app; signing secrets use the `CLINIC_*` namespace only.
- Future apps must receive a unique slug, applicationId, source path, output path and secret namespace before they are enabled in CI.

The existing root-level B2 project and its current signing workflow are intentionally untouched. Do not move its files or reuse its signing secrets in this registry.
