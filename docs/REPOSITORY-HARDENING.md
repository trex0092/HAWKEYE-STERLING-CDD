# Repository Hardening Checklist

Everything that can be enforced **from the repository** — CI gates, code scanning,
dependency review, code ownership, PR-title and label automation, SHA-pinned
actions, `harden-runner`, and a published `security.txt` — is already in place
(see [`GOVERNANCE.md`](../GOVERNANCE.md) and the `.github/` workflows).

A handful of controls can only be switched on in the **repository settings** by an
admin; they are not expressible as files. This checklist records them so the
configuration is auditable and reproducible. Paths below are under
**Settings** for `trex0092/hawkeye-sterling-cdd`.

## 1. Protect the `main` branch

**Settings → Branches → Add branch ruleset** (or *Add rule* for `main`):

- [ ] **Require a pull request before merging** — Required approvals: **1**.
- [ ] **Require review from Code Owners** — activates [`.github/CODEOWNERS`](../.github/CODEOWNERS).
- [ ] **Require status checks to pass** — add **`build`** (from CI) and, once it has
      run at least once, **`validate`** (PR-title). Optionally add `Analyze` (CodeQL)
      and `dependency-review`.
- [ ] **Require branches to be up to date before merging**.
- [ ] **Require conversation resolution before merging**.
- [ ] **Do not allow bypassing the above settings** (or scope bypass to admins only).

Rationale: turns the CODEOWNERS file and CI into an *enforced* gate rather than an
advisory one, and lets the Dependabot auto-merge workflow wait for green CI.

## 2. Enable Discussions

**Settings → General → Features → ✅ Discussions**

Makes the *Questions & discussions* link in [`SUPPORT.md`](../SUPPORT.md) and the
issue chooser ([`.github/ISSUE_TEMPLATE/config.yml`](../.github/ISSUE_TEMPLATE/config.yml))
resolve.

## 3. Allow the automation to operate

- [ ] **Settings → General → Pull Requests → ✅ Allow auto-merge** — required for the
      Dependabot patch/minor auto-merge workflow.
- [ ] **Settings → Actions → General → Workflow permissions → ✅ Allow GitHub Actions
      to create and approve pull requests** — required for `release-please` and
      Dependabot auto-merge.
- [ ] *(Recommended)* Set **Workflow permissions** to **Read repository contents and
      packages permissions** (least privilege); each workflow already elevates only
      what it needs via its own `permissions:` block.

## 4. Code security features

**Settings → Advanced Security** (or **Code security**):

- [ ] **Dependency graph** — enables Dependency Review to become a hard gate.
- [ ] **Dependabot alerts** and **Dependabot security updates**.
- [ ] **Code scanning** — CodeQL and the OpenSSF Scorecard SARIF upload publish here.
- [ ] **Secret scanning** + **Push protection**.

## 5. Repository presentation

**Repo landing page → About (⚙)** and **Settings → General**:

- [ ] **Description** — e.g. *"AML/CFT customer & counterparty due-diligence (CDD)
      workstation for the DPMS sector."*
- [ ] **Topics** — e.g. `aml`, `cft`, `compliance`, `due-diligence`, `kyc`, `react`,
      `typescript`, `vite`, `fintech`, `regtech`.
- [ ] **Website** — the live Netlify URL.
- [ ] Upload a **social preview** image (Settings → General → Social preview).

## Verifying

- **Community Standards:** the repo's `…/community` page should show every item ticked.
- **OpenSSF Scorecard:** the README badge reflects the score; enabling the settings
  above (branch protection especially) raises it.
- **Actions:** all workflows are pinned to commit SHAs — confirm with
  `grep -rE 'uses:.*@[0-9a-f]{40}' .github/workflows`.
