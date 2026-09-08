# Git Workflow & Safety Reference

This document details the safety rules, security scanning protocols, conventional commit guidelines, build system detection matrices, and edge-case handling for the `secure-push` skill.

---

## 1. Absolute Safety Mandates

When managing Git operations, follow these non-negotiable safety guardrails:

### Non-Destructive Operations

- **NEVER** run destructive commands such as:
  - `git reset --hard`
  - `git clean -f` / `git clean -fd`
  - `git checkout -- <file>`
  - `git restore <file>` (unless explicitly instructed by the user to discard a specific file)
- **NEVER** discard, overwrite, or revert uncommitted user changes.
- **NEVER** stash changes without explicitly notifying the user and providing clear recovery steps.

### Force-Push Restrictions

- **NEVER** use `git push --force`, `git push -f`, or `git push --force-with-lease` unless the user explicitly and unmistakably requests a force push.

### Sensitive File, Tracked Secret & Insecure Code Protection

Before staging or committing, inspect the repository to prevent accidental credential, secret, or insecure code exposure across working changes, tracked index files, and unpushed commits.

**1. Files and patterns to NEVER commit or keep tracked:**

- Environment and configuration files:
  - `.env`, `.env.*` (e.g., `.env.local`, `.env.production`, `.env.test`)
  - `*.local`
- Secrets and authentication keys:
  - `*.pem`, `*.key`, `*.pkcs12`, `*.pfx`
  - `id_rsa`, `id_ed25519`, `id_ecdsa`
  - `credentials.json`, `service-account*.json`, `serviceAccountKey.json`
  - `*token*`, `*secret*`, `*apiKey*` (in config files or unignored files)
- Hardcoded sensitive values in code:
  - Exposed database credentials, API tokens, plaintext auth keys.
- Sensitive IDE/system files:
  - `.DS_Store`, `Thumbs.db`
  - Private developer overrides or token configs (e.g., `.npmrc` with authToken)

**2. Tracked Sensitive Files Check:**
Run:

```bash
git ls-files --stage '*.[eE][nN][vV]*' '*.pem' '*.key' '*credentials*.json' '*service-account*.json' 'id_rsa' 'id_ed25519'
```

If any sensitive file is tracked in the Git Index, halt immediately. The remediation is to untrack it from Git while preserving the local disk copy:

```bash
git rm --cached <path/to/file>
echo "<path/to/file>" >> .gitignore
```

**3. Unpushed Commits Scan:**
Before pushing, verify all local unpushed commits (`@{u}..HEAD`):

```bash
git rev-parse --abbrev-ref @{u} >/dev/null 2>&1 && git diff @{u}..HEAD || git diff origin/HEAD..HEAD 2>/dev/null || true
```

Ensure no credentials or severe vulnerabilities were committed in earlier unpushed local commits.

**4. High-Risk SAST Code Patterns to Detect:**

- **Cross-Site Scripting (XSS)**: Unsanitized HTML rendering via `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, or `outerHTML`.
- **Reverse Tabnabbing**: External links using `target="_blank"` without `rel="noopener noreferrer"` or `rel="noreferrer"`.
- **Insecure Cookies / Tokens**: Session or auth cookies set without `secure`, `httpOnly`, or with unsafe `sameSite` policy.
- **SSL / Security Bypass**: Explicitly disabling certificate verification (`rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `verify=False`).
- **Dynamic Code / Command Execution**: Unsafe `eval()`, `new Function()`, or unsanitized shell commands via `child_process.exec()`.

---

## 2. Build System & Dependency Audit Matrix

Before committing or pushing, detect the project type and execute the appropriate verification build and dependency security audit.

| Project Type         | Detection File                        | Preferred Tool | Build Command                        | Dependency Security Audit Command       |
| :------------------- | :------------------------------------ | :------------- | :----------------------------------- | :-------------------------------------- |
| **Node.js (pnpm)**   | `pnpm-lock.yaml`                      | `pnpm`         | `pnpm run build`                     | `pnpm audit --audit-level=high`         |
| **Node.js (Yarn)**   | `yarn.lock`                           | `yarn`         | `yarn build`                         | `yarn audit --level high`               |
| **Node.js (Bun)**    | `bun.lockb` or `bun.lock`             | `bun`          | `bun run build`                      | `bun audit`                             |
| **Node.js (npm)**    | `package-lock.json` or `package.json` | `npm`          | `npm run build`                      | `npm audit --audit-level=high`          |
| **Rust**             | `Cargo.toml`                          | `cargo`        | `cargo check` (or `cargo build`)     | `cargo audit` (if installed)            |
| **Go**               | `go.mod`                              | `go`           | `go build ./...`                     | `govulncheck ./...` (if installed)      |
| **Python (Poetry)**  | `poetry.lock`                         | `poetry`       | `poetry run pytest` / `poetry check` | `pip-audit` / `poetry check`            |
| **Python (Pipenv)**  | `Pipfile.lock`                        | `pipenv`       | `pipenv check` / tests               | `pipenv check`                          |
| **Make / C / C++**   | `Makefile`                            | `make`         | `make build` or `make`               | N/A                                     |
| **Monorepo (Turbo)** | `turbo.json`                          | Project PM     | `pnpm/npm/yarn turbo run build`      | Run PM audit command in root/workspaces |
| **Monorepo (Nx)**    | `nx.json`                             | Project PM     | `pnpm/npm/yarn nx run-many -t build` | Run PM audit command in root/workspaces |

### General Build Guidelines

1. **Respect Existing Tooling**: Always use the package manager indicated by the existing lockfile.
2. **No Dependency Injections**: Never run `npm install <pkg>` or alter `package.json` arbitrarily without context.
3. **No Build Script Present**: If a JavaScript project lacks a `"build"` script in `package.json`, check for `"typecheck"` or `"test"`. If no compile/build step exists (e.g., plain documentation or static site), document that no build step was required.

---

## 3. Conventional Commit Guidelines

Commit messages must accurately summarize the diff.

### Structure

```text
<type>(<optional-scope>): <concise-title-in-imperative-mood>

- <Description bullet 1>
- <Description bullet 2>
- <Description bullet 3>
```

### Allowed Types

- `feat`: A new feature or user-facing functionality.
- `fix`: A bug fix.
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `perf`: A code change that improves performance.
- `docs`: Documentation only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, CSS adjustments).
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to the build process, tooling, or auxiliary libraries.

### Formatting Rules

1. Title must be concise (ideally <= 72 characters).
2. Title uses imperative mood: "add responsive preview" (NOT "added", NOT "adds").
3. Bullet points in the description explain **what** changed and **why** based strictly on the inspected `git diff`.
4. Commits are attributed directly to the configured user author (`git config user.name` and `user.email`).

---

## 4. Failure & Security Dialogue Protocols

### Security Violation Protocol

If any sensitive file, tracked secret, unpushed secret, or insecure code pattern is detected:

1. Immediately halt the workflow before staging or committing.
2. **Analyze the vulnerability & identify best practices**: Assess why the code or file is insecure (threat vector, exposure risk), research and apply industry security best practices (e.g., OWASP guidelines, secret isolation via environment variables, parameterized queries, secure token storage) to formulate the optimal remediation strategy.
3. **Present the security alert**:

   ```text
   ⚠️ Security Violation Detected!

   File: [file path]
   Violating code snippet:
   [Code snippet or tracked sensitive file path]

   Violation Reason & Risk:
   [Clear explanation of why this code/file is insecure and the potential security impact]

   Recommended Remediation:
   [High-level security approach to resolve the issue properly based on best practices]

   How would you like to proceed?
   1. Apply recommended fix and push (Recommended) — Fix the security issue / untrack file, verify, and proceed with commit & push.
   2. Fix locally only without pushing — Remediate the issue locally in the codebase without committing or pushing.
   3. Acknowledge risk and proceed anyway — The user explicitly accepts the documented security risk and pushes as-is.
   4. Cancel — Abort the operation without making changes.
   ```

4. **Mandatory Confirmation for Proposed Fixes**:
   When the user chooses Option 1 or Option 2, the agent **MUST** present the proposed code changes (diff, git untrack commands, or replacement snippet) along with the rationale and ask for explicit user confirmation:

   ```text
   Proposed security fix (Security Best Practice):
   [Diff, git untrack commands, or code replacement snippet]

   Rationale: [Brief explanation of how this fix resolves the security issue safely]

   Do you confirm applying this fix? (Yes / No)
   ```

5. **Handling User Decisions**:
   - **Option 1 Confirmed**: Apply fix (e.g., `git rm --cached <file>` + `.gitignore` or code patch) -> Re-scan security -> Run build & audit -> Automatically commit & push -> Report pushed commit.
   - **Option 2 Confirmed**: Apply fix locally -> Notify user that code is updated -> Stop workflow cleanly.
   - **Option 3 Selected**: Record explicit user acknowledgement and bypass the security alert, proceeding directly to the build and audit phase.
   - **Option 4 or Rejected**: Terminate immediately without making changes.

---

### Dependency Vulnerability Protocol

If a high or critical vulnerability (CVE) is detected during the package audit:

1. **Inform the user**:
   - Provide the list of vulnerable packages, severity levels, and CVE summaries.
   - Explain the operational risk of shipping these vulnerabilities to production.

2. **Present the choices**:

   ```text
   ⚠️ Critical Dependency Vulnerabilities Detected!

   Vulnerabilities Summary:
   [Package names, severities, and CVE summaries from audit]

   Security Impact:
   [Concise explanation of potential exploit vector, e.g. RCE, prototype pollution, DoS]

   How would you like to proceed?
   1. Attempt auto-fix and push — Run package audit fix, re-verify build & audit, and push upon resolution.
   2. Acknowledge dependency risks and proceed — Continue with push despite package warnings.
   3. Cancel — Abort the push operation to review dependencies manually.
   ```

3. **Handle User Decisions**:
   - **Option 1**: Run `npm audit fix` (or ecosystem equivalent) -> Re-run build and audit. If clean, proceed to commit and push.
   - **Option 2**: User accepts the risk -> Proceed to staging, commit, and push.
   - **Option 3**: Terminate immediately.

---

### Build Failure Protocol

If the pre-push build fails, follow this protocol:

1. **Do not blindly commit broken code.**
2. **Present the failure report and choices:**

   ```text
   Build failed!

   Error summary:
   [Extracted compiler / linter / build error message]

   Likely cause:
   [Concise explanation of the failure]

   Repository status:
   - Current branch: <branch>
   - Uncommitted changes preserved.

   How would you like to proceed?
   1. Fix and push — The AI agent fixes the error, verifies the build, and automatically pushes upon success.
   2. Fix only — The AI agent fixes the error locally without committing or pushing to remote.
   3. Cancel — Abort the push operation without making changes.
   ```

3. **Handling Choices**:
   - **Choice 1 ("Fix and push")**: The AI agent fixes the code, re-runs the build command. Upon passing, it stages, commits, pushes automatically, and notifies the user with the pushed commit details.
   - **Choice 2 ("Fix only")**: The AI agent fixes the code locally and verifies the build, but leaves changes uncommitted for user review.
   - **Choice 3 ("Cancel")**: Abort immediately.

---

## 5. One-Shot Execution & Completion Reporting

When repository inspection, security scanning, and build verification all succeed with zero errors:

1. **Execute in one shot**: The skill proceeds directly to staging, conventional commit creation, and pushing to remote without asking redundant approval questions.
2. **Post-Push Notification**: Always report the pushed commit details along with the appropriate link upon completion:
   - **Feature Branch**: Pull Request creation link (e.g. `https://github.com/<owner>/<repo>/pull/new/<branch>`)
   - **Main Branch (`main`/`master`)**: Main repository link (e.g. `https://github.com/<owner>/<repo>`)

   ```text
   ✅ Push Completed Successfully!

   - Commit: <short-hash> (<title>)
   - Author: <author-name> <<author-email>>
   - Branch: <branch> -> origin/<branch>
   - Pull Request: <pr-url> (or Repository: <repo-url> if on main/master)
   - Commit Message:
     <title>
     <description bullet points>
   - Files Changed:
     - <file 1>
     - <file 2>
   ```

---

## 6. Edge Cases & Recovery Procedures

### 1. No Upstream Tracking Branch

- **Symptom**: `git push` errors with `fatal: The current branch <name> has no upstream branch.`
- **Resolution**:

  ```bash
  git push -u origin <current-branch>
  ```

### 2. Divergent History (Remote Has New Commits)

- **Symptom**: `git push` rejected with `[rejected - non-fast-forward]` or `fetch first`.
- **Action**:
  - Explain to the user that the remote repository contains changes not present locally.
  - Ask the user if they would like to pull/rebase (`git pull --rebase origin <branch>`) or merge (`git pull origin <branch>`).
  - **Never** force-push to overwrite remote changes.

### 3. Detached HEAD State

- **Symptom**: Current branch shows as `HEAD (no branch)`.
- **Action**:
  - Warn the user that the repository is in a detached HEAD state.
  - Ask if they want to create a new branch from this state (`git checkout -b <new-branch>`) before committing and pushing.

### 4. Merge Conflicts / Rebase in Progress

- **Symptom**: `git status` indicates `rebase in progress` or `unmerged paths`.
- **Action**:
  - Abort push workflow.
  - Inform the user that an active merge or rebase must be completed or aborted first.

### 5. Git Pre-Commit / Pre-Push Hook Failures

- **Symptom**: `git commit` or `git push` fails due to a local git hook (e.g., Husky, lint-staged).
- **Action**:
  - Display the hook's error output.
  - Explain which check failed (e.g., linting, formatting).
  - Do NOT use `--no-verify` unless explicitly requested by the user.

### 6. Empty Staging / No Changes Detected

- **Symptom**: `git status` reports `nothing to commit, working tree clean`.
- **Action**:
  - Check if unpushed commits already exist (`git log origin/<branch>..HEAD`).
  - If unpushed commits exist, ask the user if they want to push the existing commits.
  - If no local changes or unpushed commits exist, report that the working tree is clean and up to date.
