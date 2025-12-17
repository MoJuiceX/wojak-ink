# Contributing to Wojak Ink

## Development Workflow

**⚠️ IMPORTANT: Never commit directly to `main` branch.**

All changes must go through feature branches and Pull Requests.

## Step-by-Step Workflow

### 1. Start a Feature Branch

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**
- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/component-name` - Code refactoring
- `docs/update-name` - Documentation updates

### 2. Make Your Changes

Edit files, add features, fix bugs, etc.

### 3. Test Locally (REQUIRED)

**Before committing, always test locally:**

```bash
# Install dependencies (if needed)
npm install

# Run development server
npm run dev
```

**Test in browser:**
- Open `http://localhost:5173` (or the port shown)
- Test your changes
- Check for console errors
- Test on different viewport sizes if UI changes

**Production build test (MUST PASS):**

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

**If build fails or preview looks wrong:**
- Fix issues locally
- Re-run `npm run build` and `npm run preview`
- Only proceed when both pass

### 4. Commit Your Changes

**Only commit when a chunk of work is complete:**

```bash
# Check what changed
git status

# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: add mobile bottom sheet for trait controls"
```

**Commit message format:**
- `feat: description` - New feature
- `fix: description` - Bug fix
- `refactor: description` - Code refactoring
- `docs: description` - Documentation
- `style: description` - Formatting, styling
- `perf: description` - Performance improvements

### 5. Push to Feature Branch

```bash
# Push to your feature branch (NOT main)
git push -u origin feat/your-feature-name
```

**⚠️ Git hook will block pushing to main automatically.**

### 6. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select: `feat/your-feature-name` → `main`
4. Add description of changes
5. Request review if needed
6. Wait for preview deployment (Cloudflare Pages should auto-deploy from branch)

### 7. Review Preview Deployment

- Check Cloudflare Pages dashboard for preview URL
- Test the preview deployment
- Verify all changes work correctly
- Check for any issues

### 8. Merge to Production

**Option A: GitHub PR Merge (Recommended)**

1. Review PR on GitHub
2. Get approval if required
3. Click "Merge Pull Request"
4. Cloudflare Pages will auto-deploy from `main`

**Option B: Terminal Merge (If you have direct access)**

```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Merge feature branch
git merge feat/your-feature-name

# Push to main (this will trigger production deployment)
git push origin main
```

## Testing Checklist

Before pushing, verify:

- [ ] `npm run build` passes without errors
- [ ] `npm run preview` works correctly
- [ ] No console errors in browser
- [ ] Changes work on desktop (1440px+)
- [ ] Changes work on tablet (641-1024px)
- [ ] Changes work on mobile (≤640px)
- [ ] Keyboard navigation works (if applicable)
- [ ] No layout thrashing or jank
- [ ] README.md updated (if needed)

## QA Testing

Use the QA page at `/dev/qa` to test:

1. Navigate to `/dev/qa` in browser
2. Test different viewport sizes:
   - iPhone SE (375×667)
   - iPhone Pro Max (428×926)
   - Android Chrome (360×800)
   - Desktop 1440px (1440×900)
3. Document any issues found
4. Mark issues as "Must Fix" or "Acceptable"

## Code Style

- Follow existing code patterns
- Use Windows 98 UI style (98.css)
- Maintain Tang Gang vibes
- Keep code beginner-friendly
- Add comments for complex logic

## Git Hooks

A pre-push hook is configured to prevent pushing directly to `main`:

- Location: `.githooks/pre-push`
- Automatically blocks: `git push origin main`
- Allows: Pushing to feature branches

To disable temporarily (not recommended):
```bash
git config core.hooksPath /dev/null
```

To re-enable:
```bash
git config core.hooksPath .githooks
```

## Troubleshooting

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

### Preview Doesn't Match Dev

- Clear browser cache
- Check for CSS conflicts
- Verify all imports are correct
- Check console for errors

### Git Hook Not Working

```bash
# Verify hook is executable
chmod +x .githooks/pre-push

# Verify git config
git config core.hooksPath
# Should output: .githooks
```

### Accidentally Committed to Main

```bash
# Create feature branch from current state
git checkout -b feat/fix-accidental-commit

# Reset main to previous commit
git checkout main
git reset --hard origin/main

# Continue work on feature branch
git checkout feat/fix-accidental-commit
```

## Questions?

- Check `README.md` for project overview
- Check `QA_TESTING_GUIDE.md` for testing procedures
- Review existing code patterns
- Ask in Tang Gang Discord


