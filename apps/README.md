# Independent Android apps registry

Each app has its own Android project, assets, configuration, release artifact and signing identity.

| App | Isolated path | Signing identity |
|---|---|---|
| حساب صراف | `apps/hesab-sarraf/` | Existing B2 signing secrets and keystore; preserved |
| مدیریت مطب | `apps/clinic-management/` | New independent `CLINIC_*` secrets; never shares Sarraf key |

Future apps must receive a unique slug, applicationId, source path, output path and secret namespace before being enabled in CI.

The original root-level B2 project and its original workflow remain untouched. The new branch contains a separate copy of the Sarraf Android wrapper under its app-specific path. Do not move or delete the original root files.
