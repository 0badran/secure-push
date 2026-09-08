# Gemini Secure Push Skill

A Gemini CLI / Google Antigravity skill for safely building, scanning security violations, generating conventional commits, auto-healing issues, and pushing project changes to a remote Git repository in one seamless workflow.

---

## Features

- **One-Shot Clean Execution:** Automatically inspects repository status, runs build and security checks, creates conventional commits, and pushes in a single pass when clean, reporting full pushed commit details (author, hash, PR/repo link).
- **Deep Security & Tracked Secret Detection:** Prevents accidental credential exposure across modified files, unpushed commits (`@{u}..HEAD`), and files already tracked in the Git Index (`.env*`, `*.pem`, `*.key`, `service-account*.json`).
- **Proactive SAST Code Inspection:** Catches high-risk security patterns in code diffs, including XSS (`dangerouslySetInnerHTML`), reverse tabnabbing (`target="_blank"` without `rel`), insecure cookies, and SSL bypasses.
- **Dependency Vulnerability Audits:** Runs package manager audits (`npm audit --audit-level=high`, `cargo audit`, `pip-audit`) alongside builds to detect critical CVEs before shipping.
- **Informed User Empowerment:** Explains vulnerability risks clearly and puts the user in full control with choices to apply recommended fixes, fix locally, acknowledge risks & proceed, or cancel.
- **Pre-Push Build Verification & Auto-Healing:** Validates project builds before committing. On build failures, supports "Fix and push" (AI fixes the error and completes the push automatically) or "Fix only" (fixes locally without pushing).
- **Clean Conventional Commits:** Analyzes actual Git diffs to generate concise conventional commit messages, directly attributed to your configured Git author.

---

## Prerequisites

- Ensure **Git** is installed on your system:

  ```bash
  git --version
  ```

---

## Installation

Open your **Terminal** and run one of the following commands:

### Global / User Scope (Recommended)

Make the skill available globally across all your projects in **Gemini / Google Antigravity**:

```bash
git clone https://github.com/0badran/secure-push.git ~/.gemini/config/skills/secure-push
```

### Workspace Scope

Install only for the current project **(Make sure you are in the project's root directory)**:

```bash
git clone https://github.com/0badran/secure-push.git .agents/skills/secure-push
```

---

## Usage

Invoke the skill directly in your Gemini session:

```text
/secure-push
```

Or ask naturally:

```text
Push my changes
```
