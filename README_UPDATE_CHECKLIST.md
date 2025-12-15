# README Update Checklist

**Quick reference for updating README.md during development**

Use this checklist every time you add a feature, change dependencies, or modify the setup process.

---

## 🚀 Quick Update Checklist

### When Adding a New Feature

- [ ] **Features Section**
  - [ ] Added feature name with emoji
  - [ ] Added brief description
  - [ ] Categorized (Core or Technical)

- [ ] **Using the App Section**
  - [ ] Added step-by-step instructions
  - [ ] Included screenshots/examples if helpful
  - [ ] Explained any new UI elements

- [ ] **Project Structure** (if new files/folders)
  - [ ] Added new directories
  - [ ] Explained new key files
  - [ ] Updated file tree if major changes

- [ ] **Troubleshooting** (if potential issues)
  - [ ] Added common issues
  - [ ] Added solutions
  - [ ] Mac-specific tips if needed

### When Changing Dependencies

- [ ] **Prerequisites Section**
  - [ ] Updated required versions
  - [ ] Added new dependencies
  - [ ] Updated installation instructions

- [ ] **Installation Section**
  - [ ] Updated npm install notes
  - [ ] Added new setup steps
  - [ ] Updated verification commands

- [ ] **Troubleshooting**
  - [ ] Added dependency-related issues
  - [ ] Added solutions for common problems

### When Adding Docker Support

- [ ] **Running Locally Section**
  - [ ] Added Docker option
  - [ ] Added docker-compose commands
  - [ ] Explained Docker benefits

- [ ] **Docker Setup Section**
  - [ ] Added Docker configuration details
  - [ ] Added development commands
  - [ ] Added production build commands
  - [ ] Explained Docker files

- [ ] **Prerequisites**
  - [ ] Added Docker Desktop requirement
  - [ ] Added installation link

- [ ] **Troubleshooting**
  - [ ] Added Docker-specific issues
  - [ ] Added Docker solutions

### When Changing Build/Deployment

- [ ] **Building for Production**
  - [ ] Updated build commands
  - [ ] Updated build output description
  - [ ] Updated preview commands

- [ ] **Deployment Section**
  - [ ] Updated deployment steps
  - [ ] Updated hosting instructions
  - [ ] Updated environment variable setup

- [ ] **Troubleshooting**
  - [ ] Added build-related issues
  - [ ] Added deployment issues

### When Changing Configuration

- [ ] **Project Structure**
  - [ ] Updated config file descriptions
  - [ ] Explained new settings

- [ ] **Installation/Running**
  - [ ] Updated setup steps
  - [ ] Added config file creation steps

- [ ] **Troubleshooting**
  - [ ] Added config-related issues

---

## ✅ Pre-Commit Checklist

Before committing changes that affect README:

- [ ] All new features documented
- [ ] All commands tested on Mac Terminal
- [ ] All code examples copy-paste ready
- [ ] All links working
- [ ] No Windows-specific references
- [ ] Mac-focused (Terminal, paths, shortcuts)
- [ ] Docker commands work (if Docker added)
- [ ] Tone matches Tang Gang vibes
- [ ] Beginner-friendly explanations

---

## 🧪 Testing Checklist

After updating README, test it:

- [ ] Follow installation from scratch
- [ ] Test all commands in README
- [ ] Verify Docker setup (if applicable)
- [ ] Check all links work
- [ ] Test code examples
- [ ] Verify file paths are correct
- [ ] Check Mac-specific instructions work

---

## 📝 Quick Update Template

When adding a feature, use this format:

```markdown
### [Feature Name]

[Brief description of what it does]

**How to use:**
1. Step one
2. Step two
3. Step three

**Example:**
[Code example or screenshot if helpful]
```

---

## 🎯 Mac-Specific Reminders

Always check for:

- ✅ Terminal (not PowerShell/Command Prompt)
- ✅ Cmd key (not Ctrl)
- ✅ Forward slashes in paths (/)
- ✅ Homebrew installation (if needed)
- ✅ Mac-specific troubleshooting
- ✅ Docker Desktop for Mac

---

## ⚡ Quick Commands Reference

```bash
# Test README installation
rm -rf node_modules package-lock.json
npm install
npm run dev

# Test Docker (if applicable)
docker-compose down
docker-compose build
docker-compose up

# Check for broken links (manual check)
# Open README.md, click all links

# Verify Mac commands work
# Copy/paste each command into Terminal
```

---

**Remember:** README is part of the codebase. Update it with every change! 🔥

*Last updated: [Update this date when you modify this checklist]*

