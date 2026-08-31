# Git Workflow & Safety Reference

This document details the safety rules, conventional commit guidelines, build system detection protocols, and edge-case handling for the `push` skill.

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

### Sensitive File Protection

Before staging or committing, inspect the repository to prevent accidental credential or secret exposure.

**Files and patterns to NEVER commit:**

- Environment and configuration files:
  - `.env`, `.env.*` (e.g., `.env.local`, `.env.production`, `.env.test`)
  - `*.local`
- Secrets and authentication keys:
  - `*.pem`, `*.key`, `*.pkcs12`, `*.pfx`
  - `id_rsa`, `id_ed25519`, `id_ecdsa`
  - `credentials.json`, `service-account*.json`, `serviceAccountKey.json`
  - `*token*`, `*secret*`, `*apiKey*` (in config files or unignored files)
- Sensitive IDE/system files:
  - `.DS_Store`, `Thumbs.db`
  - Private developer overrides or token configs (e.g., `.npmrc` with authToken)

**Action on Detection**:
If any suspicious or sensitive file is untracked or modified:

1. Immediately pause the workflow.
2. Alert the user with the exact path(s) identified.
3. Confirm if the file should be added to `.gitignore` before proceeding.

---

## 2. Build System Detection Matrix

Before committing or pushing, detect the project type and execute the appropriate verification build.

| Project Type         | Detection File                        | Preferred Tool | Build Command                        |
| :------------------- | :------------------------------------ | :------------- | :----------------------------------- |
| **Node.js (pnpm)**   | `pnpm-lock.yaml`                      | `pnpm`         | `pnpm run build`                     |
| **Node.js (Yarn)**   | `yarn.lock`                           | `yarn`         | `yarn build`                         |
| **Node.js (Bun)**    | `bun.lockb` or `bun.lock`             | `bun`          | `bun run build`                      |
| **Node.js (npm)**    | `package-lock.json` or `package.json` | `npm`          | `npm run build`                      |
| **Rust**             | `Cargo.toml`                          | `cargo`        | `cargo check` (or `cargo build`)     |
| **Go**               | `go.mod`                              | `go`           | `go build ./...`                     |
| **Python (Poetry)**  | `poetry.lock`                         | `poetry`       | `poetry run pytest` / `poetry check` |
| **Python (Pipenv)**  | `Pipfile.lock`                        | `pipenv`       | `pipenv check` / tests               |
| **Make / C / C++**   | `Makefile`                            | `make`         | `make build` or `make`               |
| **Monorepo (Turbo)** | `turbo.json`                          | Project PM     | `pnpm/npm/yarn turbo run build`      |
| **Monorepo (Nx)**    | `nx.json`                             | Project PM     | `pnpm/npm/yarn nx run-many -t build` |

### General Build Guidelines

1. **Respect Existing Tooling**: Always use the package manager indicated by the existing lockfile.
2. **No Dependency Injections**: Never run `npm install <pkg>` or alter `package.json` to resolve build errors during the push workflow.
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

---

## 4. Build Failure Dialogue Protocol

If the pre-push build fails, follow this strict protocol:

1. **Do not attempt auto-fixes.**
2. **Do not modify source files.**
3. **Present the standard failure message:**

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
1. Fix and push again — You can make the fixes, and I will re-run the build and push once ready.
2. Fix only — Stop the push workflow so you can resolve the issue manually.
3. Cancel — Abort the push operation without making any changes.
```

1. **Handling Options:**
   - **Choice 1 ("Fix and push again")**: Wait for the user to make/finalize the fixes, then re-execute the build step.
   - **Choice 2 ("Fix only")**: Terminate the push workflow cleanly. Do not stage or push.
   - **Choice 3 ("Cancel")**: Terminate the workflow immediately.

---

## 5. Edge Cases & Recovery Procedures

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
