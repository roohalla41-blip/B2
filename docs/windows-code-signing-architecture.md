# Windows Code Signing Architecture

## Goal
Use one verified publisher identity across all Windows applications, while keeping a separate build and release workflow for each application.

## Current status
- The Windows Code Signing Setup workflow exists on the main branch and its run was reported successful.
- It verifies that the Windows SignTool utility is available on the GitHub Actions Windows runner.
- It does not create, issue, or install a trusted code-signing certificate.
- No certificate, private key, or PFX file is stored in this repository.

## Repository and workflow structure
- Keep one workflow per Windows application.
- Each application workflow builds its own release artifact.
- Application workflows should call a shared signing workflow or script after the certificate provider is selected.
- Keep Android signing secrets and Android workflows unchanged.

## Credential and certificate requirements
- Use a certificate issued by a recognized certificate authority for public distribution.
- Confirm the provider's identity-verification, geographic, age, key-custody, and GitHub Actions integration requirements before purchase or implementation.
- Do not assume that a private key can be exported as a PFX. Use the provider's supported HSM or remote-signing method when required.
- Store signing credentials only in an approved secure signing service or protected GitHub Actions secrets. Never commit credentials.
- Do not use a self-signed certificate for public releases.

## Release validation
Before publishing each artifact:
1. Verify that the Authenticode signature status is valid.
2. Verify the publisher identity and certificate chain.
3. Verify that a trusted timestamp is present.
4. Stop publication if signing or verification fails.

## Next implementation step
After a compatible certificate provider and signing interface are confirmed, implement the reusable signing integration and separate caller workflows for each Windows application.
