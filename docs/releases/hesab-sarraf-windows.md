# Hesab Sarraf — Windows

- Target artifact: Windows installer (format to be selected after confirming the exported app source and packaging technology)
- Workflow: separate from Android and separate from Clinic Management
- Signing: Windows Authenticode certificate/provider; Android keystore is not compatible
- Credentials: store only in protected GitHub Actions secrets or the provider's supported remote/HSM signing service
- Validation: verify signature, publisher identity, certificate chain, and trusted timestamp before publishing
- Required before implementation: exported source repository/path and confirmed Windows packaging method
- Status: release target specified; no Windows installer or public-trusted signature has been produced yet.
