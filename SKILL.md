---
name: push
description: >-
  Safe, interactive workflow for building, generating conventional commit messages,
  confirming changes with the user, committing, and pushing code to the remote Git repository.
  Use when the user wants to commit and push changes, run a pre-push build check, or execute `/push`.
---

# Push Skill

The `push` skill provides a safe, interactive, and automated workflow to inspect changes, build the project, generate meaningful commit messages, obtain user confirmation, and push changes to the remote Git repository.

For in-depth safety rules, edge case resolution, and conventions, see the [Git Workflow Reference](./references/git-workflow.md).

---

## Workflow Overview

```text
[1. Inspect Repo & Diff]
│
▼
[2. Run Build Check]
│
(Build Fails) ▼
[3. User Confirmation]
│
▼
[4. Stage & Commit]
│
▼
[5. Push & Report]
```

---

## Step-by-Step Instructions

### Step 1: Inspect the Repository

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

4. **Verify changes & security scan**:
   - Check what files have been modified, added, or deleted.
   - **Sensitive File Check**: Verify that no credentials, secrets, private keys, or unignored environment files (e.g., `.env`, `.env.local`, `id_rsa`, `*.pem`, `credentials.json`, `service-account.json`) are staged or about to be committed.
   - _If sensitive files are detected, STOP immediately and alert the user._

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
   - **Other / Monorepo**: Inspect root config files (e.g. `Makefile`, `turbo.json`, `nx.json`).
   - If the project does not have a build script or compile step, check for a test/check script or note that no build step is configured.

2. **Run the build command**:
   - Execute the appropriate build command.
   - **Strict Rule**: Do NOT modify code or install new dependencies just to make the build pass.

---

### Step 3: Handle Build Results

#### Scenario A: Build Succeeded

1. **Generate Commit Information**:
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

2. **Present Confirmation to User**:
   Display the following formatted summary and wait for user confirmation:

   > Build passed successfully.
   >
   > **Commit title:** `<type>: <concise title>`
   >
   > **Description:**
   >
   > - `<bullet point 1>`
   > - `<bullet point 2>`
   >
   > **Files changed:**
   >
   > - `<file 1>`
   > - `<file 2>`
   >
   > Ready to commit and push?

3. **Wait for explicit user approval** before proceeding to commit or push.

---

#### Scenario B: Build Failed

1. **STOP immediately**.
   - Do **NOT** create a commit.
   - Do **NOT** push anything to remote.
   - Do **NOT** automatically modify source code to fix the problem.
   - Do **NOT** retry the build in a loop.

2. **Inform the user**:
   - Report that the build failed.
   - Provide the relevant error output from the build process.
   - Provide a concise explanation of the likely cause if clearly identifiable.
   - Show the current repository state.

3. **Present exactly these 3 choices**:
   1. **Fix and push again** — The user will fix the issue, then the skill will re-run the build and continue the workflow if it succeeds.
   2. **Fix only** — Stop the push workflow so the user can fix the issue manually without continuing to commit/push.
   3. **Cancel** — Close the operation without making a commit or push.

4. If the user selects **"Fix and push again"**, wait for the user to make or finalize the fixes before running the build again. Do not loop or retry without user action.

---

### Step 4: Stage and Commit

Once the build has succeeded and the user has explicitly confirmed:

1. **Stage files safely**:
   - Stage modified and tracked files explicitly or add verified new files:

     ```bash
     git add <file1> <file2> ...
     ```

   - Avoid blind `git add -A` if untracked temporary or sensitive files exist.

2. **Commit with approved title and description**:

   ```bash
   git commit -m "<title>" -m "<description>"
   ```

---

### Step 5: Push to Remote

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

2. **On Push Success**:
   Report the results clearly:
   - **Commit Hash**: `git rev-parse --short HEAD`
   - **Commit Title**: The approved commit message
   - **Remote & Branch**: Target repository and branch name
   - **Summary**: Brief confirmation of files and changes pushed

3. **On Push Failure**:
   - Do not blindly retry.
   - Display the Git error output.
   - Explain the likely cause (e.g., remote has newer commits requiring pull/rebase, lack of write permissions, branch protection).
   - Ask the user how they would like to proceed.

---

## Safety Checklist

- [ ] Repository is valid and clean of unintended files.
- [ ] Build passed completely with zero errors.
- [ ] No secrets or `.env` files staged.
- [ ] Commit message accurately reflects the `git diff`.
- [ ] User explicitly confirmed the commit title and description.
- [ ] No force pushing (`--force` / `-f`).
- [ ] No destructive Git commands used (`git reset --hard`, `git checkout --`, `git clean -fd`).
