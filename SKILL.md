---
name: secure-push
description: >-
  Safe, automated workflow for security scanning, project building, conventional commit generation,
  self-healing fixes, and pushing code to the remote Git repository.
  Use when the user wants to commit and push changes, run a pre-push build check, or execute `/secure-push`.
---

# Secure Push Skill

The `secure-push` skill provides a safe, streamlined, and automated workflow to inspect code for security violations, build the project, generate conventional commit messages, automatically resolve errors when instructed, and push changes to the remote Git repository in one seamless run while reporting all pushed commit details.

For in-depth safety rules, edge case resolution, and conventions, see the [Git Workflow Reference](./references/git-workflow.md).

---

## Workflow Overview

```text
[1. Inspect Repo, Tracked Files & Security Scan] ──(Violation)──► [Security Resolution: Fix & Push / Fix Only / Proceed at Risk / Cancel]
          │ (Clean or User Proceeds)                                       │ (User Confirms Proposed Fix)
          ▼                                                                ▼
[2. Run Build & Dependency Audit] ───(Build/Audit Fails)────────► [Resolution: Fix & Push / Fix Only / Proceed at Risk / Cancel]
          │ (Build & Audit Pass or User Proceeds)                          │
          ▼                                                                │
[3. Auto Stage & Conventional Commit] ◄────────────────────────────────────┘ (If Fix & Push Passes)
          │
          ▼
[4. Push to Remote & Report Commit Details]
```

---

## Step-by-Step Instructions

### Step 1: Inspect the Repository & Security Scan

Before making any assumptions or running git mutations:

1. **Verify Git repository**:

   ```bash
   git rev-parse --is-inside-work-tree
   ```

   _If not inside a git repository, stop immediately and notify the user._

2. **Check current branch & upstream remote**:

   ```bash
   git branch --show-current
   git remote -v
   git status -sb
   ```

3. **Inspect status, tracked secrets, and diffs**:

   ```bash
   # Working tree & staged changes
   git status
   git diff
   git diff --cached

   # Check for tracked sensitive files already committed to the Git Index
   git ls-files --stage '*.[eE][nN][vV]*' '*.pem' '*.key' '*credentials*.json' '*service-account*.json' 'id_rsa' 'id_ed25519'

   # Check unpushed commits (against upstream tracking branch or origin default)
   git rev-parse --abbrev-ref @{u} >/dev/null 2>&1 && git diff @{u}..HEAD || git diff origin/HEAD..HEAD 2>/dev/null || true
   ```

4. **Security Scan (Sensitive Files, Tracked Secrets, Unpushed Commits & SAST Patterns)**:
   - **Tracked Sensitive Files**: Detect any secrets, `.env*` files, or private keys currently tracked in the Git Index.
   - **Unpushed Commits Check**: Scan all commits between the local branch and upstream remote (`@{u}..HEAD`) for exposed credentials or vulnerable code.
   - **Sensitive Files Check**: Ensure no credentials, private keys, or unignored environment files (e.g., `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `credentials.json`, `service-account*.json`) are about to be staged or committed.
   - **Insecure Code & SAST Patterns Check**: Scan all modified code and unpushed diffs for high-risk security patterns:
     - **XSS & Direct HTML Injection**: `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, or `outerHTML` without proper sanitization (e.g., DOMPurify).
     - **Reverse Tabnabbing**: Links using `target="_blank"` without `rel="noopener noreferrer"` or `rel="noreferrer"`.
     - **Insecure Cookies / Tokens**: Cookies configured without `secure`, `httpOnly`, or using insecure `sameSite` values.
     - **SSL / Security Bypass**: `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `verify=False`.
     - **Dangerous Dynamic Execution**: `eval()`, `new Function()`, or unsanitized shell commands via `child_process.exec()`.
     - **Exposed Secrets**: Hardcoded API keys, JWT tokens, plaintext passwords, database connection URIs.

5. **Handling Security Violations & User Empowerment**:
   If any sensitive file, tracked secret, or insecure code pattern is detected:
   1. **STOP immediately**. Do NOT stage, commit, or push.
   2. **Analyze the vulnerability & identify best practices**: Assess why the code or file is insecure (threat vector, exposure risk, OWASP guideline), and formulate the optimal remediation strategy (e.g., untrack with `git rm --cached` and add to `.gitignore`, sanitize HTML, add `rel="noopener noreferrer"`, use environment variables).
   3. **Alert the user & detail the risks**: Show the exact file path, violating snippet, security risk, and recommended remediation:

      ```text
      ⚠️ Security violation detected!
      File: <path/to/file>
      Violating code:
      [Code snippet or tracked sensitive file path]

      Violation Reason & Risk:
      [Clear explanation of why this is insecure and the potential security impact if pushed]

      Recommended Remediation:
      [High-level security approach to resolve the issue properly based on best practices]

      How would you like to proceed?
      1. Apply recommended fix and push (Recommended) — Remediate the vulnerability, re-scan, build, and push.
      2. Fix locally only without pushing — Remediate the issue in local files only without committing or pushing.
      3. Acknowledge risk and proceed anyway — Push with the existing code/files at your own discretion.
      4. Cancel — Abort the workflow immediately without making changes.
      ```

   4. **Mandatory User Confirmation for Fixes**:
      When the user selects Option 1 or Option 2, the agent **MUST** display the proposed best-practice fix (code diff, git commands, or replacement snippet) along with an explanation, and request explicit user confirmation before modifying code:

      ```text
      Proposed security fix (Security Best Practice):
      [Diff / Proposed secure replacement / git untrack command]

      Rationale: [Brief explanation of how this fix eliminates the vulnerability safely]

      Do you confirm applying this fix? (Yes / No)
      ```

   5. **Execute according to user selection**:
      - **If Choice 1 confirmed**: Apply the security fix (e.g. `git rm --cached <file>` + update `.gitignore` for tracked secrets, or code diff for SAST), re-run security scan, and proceed to Step 2 (Build & Dependency Audit). If successful, automatically commit and push.
      - **If Choice 2 confirmed**: Apply the fix locally, notify the user that local files were updated, and terminate cleanly without staging or pushing.
      - **If Choice 3 selected**: Record user acknowledgement and proceed directly to Step 2 (Build & Dependency Audit).
      - **If Choice 4 (or user rejects the proposed fix)**: Terminate the workflow immediately without making changes.

---

### Step 2: Build & Dependency Audit Before Pushing

Never commit or push untested code that fails to build or introduces critical known package vulnerabilities.

1. **Detect build system & package manager**:
   - **Node.js / JavaScript / TypeScript**:
     - Check `package.json` for a `"build"` script.
     - Detect package manager by lockfile:
       - `pnpm-lock.yaml` ➔ `pnpm run build` | Audit: `pnpm audit --audit-level=high`
       - `yarn.lock` ➔ `yarn build` | Audit: `yarn audit --level high`
       - `bun.lockb` / `bun.lock` ➔ `bun run build` | Audit: `bun audit`
       - `package-lock.json` (or fallback) ➔ `npm run build` | Audit: `npm audit --audit-level=high`
   - **Rust**: `Cargo.toml` ➔ `cargo check` (or `cargo build`) | Audit: `cargo audit` (if installed)
   - **Go**: `go.mod` ➔ `go build ./...` | Audit: `govulncheck ./...` (if installed)
   - **Python**: `poetry.lock` ➔ `poetry check` / tests, `Pipfile.lock` ➔ `pipenv check` / tests | Audit: `pip-audit` (if installed)
   - **Other / Monorepo**: Inspect root config files (e.g. `Makefile`, `turbo.json`, `nx.json`).
   - If no build script or compile step exists, check for a test/check script or note that no build step was configured.

2. **Run the build and dependency audit**:
   - Execute the appropriate build command.
   - Run the dependency audit check.

---

### Step 3: Handle Build & Audit Results

#### Scenario A: Build and Audit Succeeded (Clean Run — One-Shot Execution)

If the security scan, dependency audit, and build check pass with zero issues (or the user previously acknowledged warnings):

1. **Execute the workflow in one shot** without asking for redundant confirmations.
2. **Generate Commit Information**:
   - **Commit Title**: Create a concise, conventional commit message (max 72 characters):
     - `feat:` for new features
     - `fix:` for bug fixes
     - `refactor:` for code restructuring without feature changes
     - `perf:` for performance optimizations
     - `docs:` for documentation changes
     - `style:` for styling/formatting adjustments
     - `test:` for test additions/updates
     - `chore:` for build, tooling, or dependency maintenance
   - **Commit Description**: Create bullet points detailing the key changes based on the actual Git diff.
3. **Stage & Commit**:
   - Stage modified and tracked files explicitly:

     ```bash
     git add <file1> <file2> ...
     ```

   - Commit with the generated title and description:

     ```bash
     git commit -m "<title>" -m "<description>"
     ```

4. **Proceed immediately to Step 4 (Push & Report)**.

---

#### Scenario B: Build Failed (Build Resolution)

1. **STOP immediately**.
   - Do **NOT** commit.
   - Do **NOT** push anything to remote.

2. **Inform the user**:
   - Report that the build failed.
   - Provide the relevant error output from the build process.
   - Provide a concise explanation of the likely cause.

3. **Present exactly these 3 choices**:
   1. **Fix and push** — The AI agent fixes the error, re-runs the build check, and if the build passes, automatically proceeds to commit and push without requiring manual user intervention.
   2. **Fix only** — The AI agent fixes the error in the codebase locally, verifies the fix, but stops there without staging, committing, or pushing to remote.
   3. **Cancel** — Abort the push operation without making changes.

4. **Execute based on user selection**:
   - If **Choice 1 ("Fix and push")**: Agent fixes the code, runs the build command again. Once the build succeeds, it automatically creates the conventional commit, pushes to remote, and reports the commit details.
   - If **Choice 2 ("Fix only")**: Agent fixes the code, runs the build to verify, and informs the user that the fix is applied locally without committing or pushing.
   - If **Choice 3 ("Cancel")**: Terminate immediately.

---

#### Scenario C: Critical Dependency Vulnerabilities Detected (Audit Resolution)

If the dependency audit reports high or critical known vulnerabilities (CVEs):

1. **Inform the user**:
   - Report the vulnerable package names, severity level, and vulnerability synopsis.
   - Explain the potential risks of deploying known vulnerable dependencies.

2. **Present choices to the user**:
   1. **Attempt auto-fix and push** — Run the package manager's audit fix (e.g., `npm audit fix`), re-verify the build & audit, and push if clean.
   2. **Acknowledge dependency risks and proceed** — Continue with the push despite known package warnings.
   3. **Cancel** — Abort the push operation to address dependency issues manually.

3. **Execute based on user selection**:
   - If **Choice 1**: Apply audit fix, re-run build and audit, and proceed if resolved.
   - If **Choice 2**: Proceed directly to Step 4 (Stage, Commit and Push).
   - If **Choice 3**: Terminate immediately.

---

### Step 4: Stage, Commit and Push to Remote

1. **Push changes**:
   - If upstream tracking exists:

     ```bash
     git push
     ```

   - If the branch does not have an upstream branch configured yet:

     ```bash
     git push -u origin <current-branch>
     ```

   - **Strict Safety Rule**: Never use `git push --force` or `git push -f` unless the user explicitly requested a force push.

2. **On Push Failure**:
   - Do not blindly retry.
   - Display the Git error output.
   - Explain the likely cause (e.g., remote has newer commits requiring pull/rebase, lack of write permissions, branch protection).
   - Offer the user clear recovery options (e.g., `git pull --rebase origin <branch>`).

---

### Step 5: Report Pushed Commit Details & Repository / PR Link

Upon successful push, construct the appropriate link:

- **Feature Branch**: Pull Request creation link (e.g., `https://github.com/<owner>/<repo>/pull/new/<current-branch>`).
- **Main Branch (`main`/`master`)**: Main repository link (e.g., `https://github.com/<owner>/<repo>`).

Notify the user with a complete, structured summary of what was pushed:

```text
**Successfully pushed to remote!**

- Commit: <short-hash> (<full-commit-title>)
- Author: <author-name> <<author-email>>
- Branch: <current-branch> -> <remote-name>/<current-branch>
- Pull Request: <pr-url> (or Repository: <repo-url> if on main/master)
- Commit Message:
  <title>
  <description bullet points>
- Files Changed:
  - <file 1>
  - <file 2>
```

---

## Safety Checklist

- [ ] Repository is valid and clean of unintended files.
- [ ] No tracked sensitive files in Git Index (`.env*`, `.pem`, `.key`, `service-account*.json`).
- [ ] Unpushed commits scanned for exposed secrets or vulnerable code (`@{u}..HEAD`).
- [ ] Security scan passed (no secrets or unmitigated high-risk SAST patterns: XSS, Tabnabbing, insecure cookies, SSL bypass).
- [ ] Any security violation or tracked secret was presented with risks and resolved according to user choice.
- [ ] Any code modification fix was explicitly confirmed by the user with proposed code diff shown.
- [ ] Build and dependency audit passed (or audit warnings acknowledged by user).
- [ ] Conventional commit message accurately reflects the `git diff`.
- [ ] Clean runs execute automatically in one pass and notify the user with pushed commit details.
- [ ] "Fix and push" automatically heals the build and completes the push.
- [ ] "Fix only" updates local code without touching the remote repository.
- [ ] No force pushing (`--force` / `-f`).
- [ ] No destructive Git commands used (`git reset --hard`, `git checkout --`, `git clean -fd`).
