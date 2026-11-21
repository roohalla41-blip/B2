# Clinic Management — Windows

- Target artifact: separate Windows installer
- Source project: independent Clinic Management application; never combine it with Hesab Sarraf
- Workflow: its own Windows build/release workflow
- Signing: Windows Authenticode certificate/provider; Android keystore is not compatible
- Credentials: protected GitHub Actions secrets or supported remote/HSM signing service only
- Required before implementation: exported source repository/path and confirmed Windows packaging method
- Status: release target specified; no Windows installer or public-trusted signature has been produced yet.
