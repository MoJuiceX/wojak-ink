# README Creation Workflow for Wojak Ink

## Purpose
This document outlines the workflow and rules for creating and maintaining the README.md file for the Wojak Ink project - a gift from Bullish0xCrypto to Abit for his upcoming Wojak NFT collection on Chia.

> **Quick Reference:** See `README_UPDATE_CHECKLIST.md` for a fast checklist when updating README during development.

## Target Audience
- **Primary**: Abit (a chad getting into AI development)
- **Secondary**: Developers, contributors, and the Tang Gang community

## Workflow Rules

### 1. Structure Requirements
The README must include:
- **Project Overview**: What it is, who it's for, why it exists
- **Installation Guide**: Step-by-step local setup
- **Usage Instructions**: How to use all features
- **Testing Guide**: How to test locally
- **Deployment Guide**: Production deployment steps
- **Cursor Integration**: How to use Cursor for development
- **Feature Documentation**: All major features explained
- **Troubleshooting**: Common issues and solutions

### 2. Tone & Style Guidelines
- **Tang Gang Vibes**: Use casual, meme-friendly language
- **Bullish0xCrypto Energy**: Keep it enthusiastic and supportive
- **Beginner-Friendly**: Explain everything as if Abit is new to development
- **Professional but Fun**: Balance technical accuracy with personality
- **Community-Focused**: Reference the Tang Gang and Chia community

### 3. Technical Accuracy
- All commands must be tested and verified
- Code examples must be copy-paste ready
- File paths must be accurate
- Dependencies must be listed correctly
- Environment requirements clearly stated

### 4. Visual Elements
- Use emojis sparingly but effectively
- Include code blocks with proper syntax highlighting
- Use clear section headers
- Add visual separators for readability
- Include badges if applicable

### 5. Update Protocol (CRITICAL - Ongoing Development)

**This README is a living document that MUST be updated as development continues.**

#### When to Update README

Update README immediately when:
- ✅ New features are added
- ✅ Dependencies change (package.json updates)
- ✅ Deployment process changes
- ✅ New tools or workflows are introduced (e.g., Docker setup)
- ✅ Breaking changes occur
- ✅ Configuration files change
- ✅ Environment variables are added/removed
- ✅ New scripts are added to package.json
- ✅ Testing procedures change
- ✅ Installation steps change

#### Update Workflow (For Bullish0xCrypto)

**Before handing off to Abit, follow this process:**

1. **Develop & Test Feature**
   - [ ] Feature works locally
   - [ ] Feature tested on Mac
   - [ ] No console errors
   - [ ] All related features still work

2. **Update README Immediately**
   - [ ] Add feature to "Features" section
   - [ ] Document usage in "Using the App" section
   - [ ] Update installation if needed
   - [ ] Update Docker setup if changed
   - [ ] Add to troubleshooting if issues found
   - [ ] Update project structure if files added

3. **Test README Instructions**
   - [ ] Follow README from scratch (fresh install)
   - [ ] Verify all commands work on Mac
   - [ ] Test Docker setup (if applicable)
   - [ ] Verify all links work
   - [ ] Check code examples are correct

4. **Final Review**
   - [ ] README is Mac-focused (no Windows references)
   - [ ] All new features documented
   - [ ] Tone matches Tang Gang vibes
   - [ ] Beginner-friendly explanations
   - [ ] No broken links or outdated info

#### Feature Addition Template

When adding a new feature, use this checklist:

```markdown
## New Feature: [Feature Name]

### Documentation Checklist:
- [ ] Added to "Features" section with emoji and description
- [ ] Added to "Using the App" section with step-by-step
- [ ] Updated "Project Structure" if new files/folders
- [ ] Added to "Troubleshooting" if potential issues
- [ ] Updated Docker setup if needed
- [ ] Updated installation if new dependencies
- [ ] Added screenshots/examples if helpful
- [ ] Tested all instructions on Mac
```

#### Quick Update Checklist (Before Each Commit)

Before committing changes that affect README:

- [ ] README reflects current state of project
- [ ] All new features documented
- [ ] All commands tested on Mac Terminal
- [ ] Docker commands work (if Docker added)
- [ ] No Windows-specific references
- [ ] Links are working
- [ ] Code examples are copy-paste ready

### 6. Cursor-Specific Section
Must include:
- How to open project in Cursor
- How to use Cursor AI features
- How to add new features with Cursor
- How to edit existing code with Cursor
- Best practices for Cursor development

### 7. Deployment Section
Must cover:
- Build process
- Environment variables
- Hosting options
- Domain configuration
- SSL/HTTPS setup
- Post-deployment verification

### 8. Community & Credits
- Always credit Bullish0xCrypto
- Reference Tang Gang culture
- Include links to relevant communities
- Maintain positive, supportive tone

## Maintenance Checklist

### Pre-Handoff Checklist (Before Giving to Abit)

- [ ] All links are working
- [ ] All commands are tested on Mac
- [ ] Code examples are current and tested
- [ ] Dependencies match package.json exactly
- [ ] Docker setup documented (if using Docker)
- [ ] Installation works from scratch on Mac
- [ ] All features documented and tested
- [ ] Troubleshooting covers common Mac issues
- [ ] No Windows-specific references remain
- [ ] Screenshots (if any) are current
- [ ] Contact/support info is accurate
- [ ] License information is correct
- [ ] README follows Mac conventions (Terminal, paths, etc.)

### Ongoing Maintenance (During Development)

**Every time you add/change something:**

1. **Immediate Update** - Don't wait, update README right away
2. **Test Instructions** - Follow your own README to verify
3. **Mac Verification** - Test on Mac Terminal (not just reading)
4. **Docker Check** - If Docker changed, test docker-compose commands
5. **Quick Review** - Scan for Windows references, broken links

### Weekly Review (Recommended)

Even during active development, do a quick weekly check:

- [ ] README matches current codebase
- [ ] New features from this week are documented
- [ ] Dependencies are up to date
- [ ] All commands still work
- [ ] Docker setup (if used) is current

## Review Process

### Before Each Major Update

1. **Technical Review**
   - [ ] All commands tested on Mac Terminal
   - [ ] Code examples work when copy-pasted
   - [ ] File paths are correct for Mac
   - [ ] Dependencies match package.json
   - [ ] Docker commands work (if applicable)

2. **Content Review**
   - [ ] Tone matches Tang Gang vibes
   - [ ] Beginner-friendly explanations
   - [ ] No jargon without explanation
   - [ ] Mac-focused (no Windows references)

3. **Link & Reference Check**
   - [ ] All external links work
   - [ ] Internal links (anchors) work
   - [ ] File references are correct
   - [ ] Version numbers are current

4. **Final Polish**
   - [ ] Spelling and grammar
   - [ ] Consistent formatting
   - [ ] Emojis used appropriately
   - [ ] Sections flow logically

### Pre-Handoff Final Review

Before giving the project to Abit:

1. **Fresh Install Test**
   - Start with a clean Mac
   - Follow README from top to bottom
   - Document any issues found
   - Fix and update README

2. **Feature Completeness**
   - Every feature in code is documented
   - Every window/component explained
   - All scripts in package.json documented
   - All configuration options explained

3. **Docker Verification** (if using Docker)
   - Docker setup works from scratch
   - docker-compose commands are correct
   - Production Docker build works
   - All Docker benefits explained

4. **Beginner Test**
   - Have someone new to development read it
   - Can they follow it without help?
   - Are there any confusing parts?
   - Update based on feedback

## Update Reminders

**Set reminders to update README when:**
- Adding new npm packages
- Changing build process
- Adding Docker support
- Changing deployment method
- Adding new windows/components
- Changing API integrations
- Updating environment variables

**Pro Tip:** Add a comment in your code when adding features:
```js
// TODO: Update README.md - New feature: [Feature Name]
```

---

## Mac-Specific Guidelines

Since this is for Mac users (Abit), ensure:

- ✅ All terminal commands use Mac syntax
- ✅ File paths use forward slashes (/)
- ✅ References to "Terminal" not "PowerShell" or "Command Prompt"
- ✅ Homebrew installation instructions (if needed)
- ✅ Mac keyboard shortcuts (Cmd instead of Ctrl)
- ✅ Docker Desktop for Mac references
- ✅ Mac-specific troubleshooting tips

---

*This workflow ensures the README stays helpful, accurate, and true to the Tang Gang spirit while being accessible to developers at all levels. Remember: README is part of the codebase - update it with every change!*

