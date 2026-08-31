# Gemini Push Skill

A Gemini CLI skill for safely building, reviewing, generating conventional commits, and pushing project changes to a remote Git repository without breaking builds.

---

## 🚀 Features

- **Pre-Push Build Check:** Automatically verifies your project's build command before committing.
- **Conventional Commits:** Analyzes actual Git diffs to generate concise, descriptive commit messages.
- **Interactive Safety:** Requests user confirmation before committing or pushing; stops and offers recovery options on build failures.
- **Secret Protection:** Prevents accidental staging of `.env` files, credentials, and API keys.

---

## 📦 Installation

### User Scope (Recommended)

Make the skill available globally across all your projects:

```bash
git clone https://github.com/0badran/push-skill.git ~/.gemini/config/skills/push
```

### Workspace Scope

Install only for the current project:

```bash
git clone https://github.com/0badran/push-skill.git .agents/skills/push
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
