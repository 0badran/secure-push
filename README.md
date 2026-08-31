# Gemini Secure Push Skill

A Gemini CLI / Google Antigravity skill for safely building, scanning security violations, generating conventional commits, auto-healing issues, and pushing project changes to a remote Git repository in one seamless workflow.

---

## 🚀 Features

- **⚡ One-Shot Clean Execution:** Automatically inspects repository status, runs build and security checks, creates conventional commits, and pushes in a single pass when clean, reporting pushed commit details upon completion.
- **🛡️ Security & Insecure Code Protection:** Halts on sensitive files or insecure patterns, explains the vulnerability risk, proposes best-practice remediations with clear rationale, and supports both "Fix & push" and "Fix only" with mandatory user confirmation.
- **🔧 Pre-Push Build Verification & Auto-Healing:** Validates project builds before committing. On build failures, supports "Fix and push" (AI fixes the error and completes the push automatically) or "Fix only" (fixes locally without pushing).
- **📝 Conventional Commits:** Analyzes actual Git diffs to generate concise, descriptive conventional commit messages.

---

## 📋 Prerequisites

- Ensure **Git** is installed on your system:

  ```bash
  git --version
  ```

---

## 📦 Installation

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

## 🎯 Usage

Invoke the skill directly in your Gemini session:

```text
/secure-push
```

Or ask naturally:

```text
Push my changes
```
