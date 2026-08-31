# Gemini Push Skill

A Gemini CLI skill for safely building, reviewing, generating conventional commits, and pushing project changes to a remote Git repository without breaking builds.

---

## 🚀 Features

- **Pre-Push Build Check:** Automatically verifies your project's build command before committing.
- **Conventional Commits:** Analyzes actual Git diffs to generate concise, descriptive commit messages.
- **Interactive Safety:** Requests user confirmation before committing or pushing; stops and offers recovery options on build failures.
- **Secret Protection:** Prevents accidental staging of `.env` files, credentials, and API keys.

---

## 📋 Prerequisites

- Ensure **Git** is installed on your system. You can verify with:

  ```bash
  git --version
  ```

---

## 📦 Installation

Open your **Terminal** and run one of the following commands:

### Global / User Scope (Recommended)

Make the skill available globally across all your projects in **Gemini / Google Antigravity**:

```bash
git clone https://github.com/0badran/push.git ~/.gemini/config/skills/push
```

### Workspace Scope

Install only for the current project **(Make sure you are in the project's root directory)**:

```bash
git clone https://github.com/0badran/push.git .agents/skills/push
```

---

## 🎯 Usage

Invoke the skill directly in your Gemini session:

```text
/push
```

Or ask naturally:

```text
Push my changes
```
