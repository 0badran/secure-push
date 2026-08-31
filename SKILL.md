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
[1. Inspect Repo & Security Scan] ──(Security Violation)──► [Security Resolution: Fix & Push / Fix Only / Cancel]
          │ (Clean)                                                       │ (User Confirms Proposed Fix)
          ▼                                                               ▼
[2. Run Build Check] ─────────────(Build Fails)───────────► [Build Resolution: Fix & Push / Fix Only / Cancel]
          │ (Build Passes)                                                │
          ▼                                                               │
[3. Auto Stage & Conventional Commit] ◄───────────────────────────────────┘ (If Fix & Push & Build Passes)
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

3. **Inspect status and diffs**:

   ```bash
   git status
   git diff
   git diff --cached
   ```

4. **Security Scan (Sensitive Files & Insecure Code Patterns)**:
   - Check all modified, added, or staged files.
   - **Sensitive Files Check**: Ensure no credentials, secrets, private keys, or unignored environment files (e.g., `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `credentials.json`, `service-account*.json`) are about to be committed.
   - **Insecure Code Check**: Scan diffs for exposed API keys, plaintext secrets, database credentials, dangerous hardcoded tokens, or clear security violations.

5. **Handling Security Violations**:
   If any sensitive file or insecure code pattern is detected:
   1. **STOP immediately**. Do NOT stage, commit, or push.
   2. **Analyze the vulnerability & identify best practices**: Assess why the code or file is insecure (threat vector, exposure risk), research and apply industry security best practices (e.g., OWASP guidelines, secret isolation via environment variables, parameterized queries, secure token storage) to formulate the optimal remediation strategy.
   3. **Alert the user**: Show the exact file path, violating code snippet, violation reason & security risk, and recommended remediation:

      ```text
      ⚠️ Security violation detected!
      File: <path/to/file>
      Violating code:
      [Code snippet showing the exposed secret or insecure code]

      Violation Reason & Risk:
      [Clear explanation of why this code is insecure and the potential security impact]

      Recommended Remediation:
      [High-level security approach to resolve the issue properly based on best practices]

      How would you like to proceed?
      1. Fix code to be secure and push
      2. Fix code only without pushing
      3. Cancel
      ```

   4. **Mandatory User Confirmation for Fixes**:
      In both fix choices (1 and 2), the agent **MUST** display the proposed best-practice fix (code diff or replacement snippet) along with an explanation/rationale, and request explicit user confirmation before modifying the code:

      ```text
      Proposed security fix (Security Best Practice):
      [Diff / Proposed secure replacement]

      Rationale: [Brief explanation of how this fix eliminates the vulnerability safely]

      Do you confirm applying this fix? (Yes / No)
      ```

   5. **Execute according to user selection**:
      - **If Choice 1 confirmed**: Apply the security fix, re-run security scan, and proceed directly to Step 2 (Build Check). If the build passes, automatically commit and push.
      - **If Choice 2 confirmed**: Apply the security fix locally in the codebase, notify the user that the code was fixed, and terminate the workflow without staging or pushing.
      - **If Choice 3 (or user rejects the fix)**: Terminate the workflow immediately without making changes.

---

### Step 2: Build Before Pushing

Never commit or push untested code that fails to build.

1. **Detect build system & package manager**:
   - **Node.js / JavaScript / TypeScript**:
     - Check `package.json` for a `"build"` script.
     - Detect package manager by lockfile:
       - `pnpm-lock.yaml` ➔ `pnpm run build`
       - `yarn.lock` ➔ `yarn build`
       - `bun.lockb` / `bun.lock` ➔ `bun run build`
       - `package-lock.json` (or fallback) ➔ `npm run build`
   - **Rust**: `Cargo.toml` ➔ `cargo check` or `cargo build`
   - **Go**: `go.mod` ➔ `go build ./...`
   - **Python**: `poetry.lock` ➔ `poetry check` / tests, `Pipfile.lock` ➔ `pipenv check`, etc.
   - **Other / Monorepo**: Inspect root config files (e.g. `Makefile`, `turbo.json`, `nx.json`).
   - If no build script or compile step exists, check for a test/check script or note that no build step was configured.

2. **Run the build command**:
   - Execute the appropriate build command.

---

### Step 3: Handle Build Results

#### Scenario A: Build Succeeded (Clean Run — One-Shot Execution)

If the security scan and build check pass with zero issues:

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
   - **Commit Description**: Create bullet points detailing the key changes based on the actual Git diff, followed by a blank line and the co-author trailer `Co-authored-by: Google Gemini <gemini@google.com>` to attribute collaboration in GitHub Contributors.
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

### Step 5: Report Pushed Commit Details

Upon successful push, notify the user with a complete, structured summary of what was pushed:

```text
✅ Successfully pushed to remote!

- Commit: <short-hash> (<full-commit-title>)
- Branch: <current-branch> -> <remote-name>/<current-branch>
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
- [ ] Security scan passed (no sensitive files, API keys, or insecure code).
- [ ] Any security violation fix was explicitly confirmed by the user with proposed code diff shown.
- [ ] Build passed completely with zero errors.
- [ ] Conventional commit message accurately reflects the `git diff`.
- [ ] Clean runs execute automatically in one pass and notify the user with pushed commit details.
- [ ] "Fix and push" automatically heals the build and completes the push.
- [ ] "Fix only" updates local code without touching the remote repository.
- [ ] No force pushing (`--force` / `-f`).
- [ ] No destructive Git commands used (`git reset --hard`, `git checkout --`, `git clean -fd`).
