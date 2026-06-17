# Security Policy

This is an AML/CFT compliance application; we take security reports seriously.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately via GitHub's **[Private vulnerability reporting](https://github.com/trex0092/hawkeye-sterling-cdd/security/advisories/new)**
(Security → Report a vulnerability), or email the repository owner.

Please include:

- a description of the issue and its impact,
- steps to reproduce (or a proof of concept),
- affected version/commit, and
- any suggested remediation.

We aim to acknowledge reports within **3 business days** and to provide a
remediation timeline after triage. Please allow reasonable time for a fix before
any public disclosure.

## Handling notes

- No secrets are committed to this repository. Configuration (passphrase, auth
  endpoint, Asana webhook) is supplied at build time via `VITE_*` environment
  variables — see `.env.example`.
- Dependency advisories are tracked via `npm audit` and Dependabot. Current
  advisories are confined to dev tooling and do not ship in the production bundle.
