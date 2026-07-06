# Repository Hardening Checklist

Everything that can be enforced **from the repository** — CI gates, code scanning,
dependency review, code ownership, PR-title and label automation, SHA-pinned
actions, `harden-runner`, and a published `security.txt` — is already in place
(see [`GOVERNANCE.md`](../GOVERNANCE.md) and the `.github/` workflows).

A handful of controls can only be switched on in the **repository settings** by an
admin; they are not expressible as workflow files, and the GitHub REST API for
them is not reachable from the automation environment (org proxy policy returns
`403` for `api.github.com`). This checklist records them so the configuration is
auditable and reproducible; where possible it ships an importable config so the
setting is a single action. Paths below are under **Settings** for
`trex0092/hawkeye-sterling-cdd`.

## 1. Protect the `main` branch — one-click import

A ready-to-import ruleset is committed at
[`.github/rulesets/main-branch-protection.json`](../.github/rulesets/main-branch-protection.json).

**Settings → Rules → Rulesets → New ruleset → Import a ruleset** → choose that
file → **Create**. It applies, on the default branch:

- Require a pull request with **1 approval** and **Code Owner review**
  (activates [`.github/CODEOWNERS`](../.github/CODEOWNERS)).
- Dismiss stale approvals on push; require conversation resolution.
- Require status checks (strict / up-to-date): **`build`**, **`validate`**,
  **`actionlint`**, **`Zizmor workflow security audit`**.
- Block force-pushes and branch deletion; require linear history; squash-only merges.

> After import, confirm each required check name matches what appears on a recent
> PR (GitHub lists them as you type), and add any others you want to gate on
> (e.g. `Analyze (javascript-typescript)`, `lighthouse`). `dependency-review`
> should be added **only after** step 4 enables the Dependency Graph.

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
