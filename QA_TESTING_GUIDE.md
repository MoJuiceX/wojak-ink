# QA Testing Guide

## Overview

This guide provides structured QA testing procedures for the Wojak Ink application across different viewports and interaction methods.

## Accessing the QA Page

Navigate to `/dev/qa` in your browser to access the QA testing interface. This page provides:
- Real-time viewport information
- Device category detection
- Safe-area insets for notched devices
- Grid overlay for alignment checking
- Issues log for documenting problems

## Test Scenarios

### 1. iPhone SE (375x667)

**Viewport:** 375px × 667px  
**Device Category:** Mobile  
**Testing Checklist:**
- [ ] Wojak Creator opens and displays correctly
- [ ] Bottom sheet appears at bottom of screen
- [ ] Bottom sheet collapses/expands smoothly
- [ ] Canvas is visible and not cut off
- [ ] Taskbar is accessible and doesn't overlap content
- [ ] Windows open fullscreen (not draggable)
- [ ] Only one window is open at a time
- [ ] Safe-area insets are respected (no notch overlap)
- [ ] Touch targets are at least 44×44px
- [ ] No horizontal scrolling
- [ ] Keyboard navigation works (if applicable)

**Common Issues:**
- Bottom sheet overlapping canvas
- Windows not fullscreen on mobile
- Content cut off by notch/home bar
- Touch targets too small

### 2. iPhone Pro Max (428x926)

**Viewport:** 428px × 926px  
**Device Category:** Mobile  
**Testing Checklist:**
- [ ] All iPhone SE checks apply
- [ ] Safe-area insets are larger (notch + home bar)
- [ ] Content doesn't overlap with notch
- [ ] Bottom sheet respects safe-area-inset-bottom
- [ ] Landscape orientation works (if applicable)

**Common Issues:**
- Notch overlap
- Home bar overlap
- Safe-area insets not applied

### 3. Android Chrome (360x800)

**Viewport:** 360px × 800px  
**Device Category:** Mobile  
**Testing Checklist:**
- [ ] All mobile checks apply
- [ ] Display cutouts handled (if device has them)
- [ ] Chrome-specific behaviors work correctly
- [ ] Address bar doesn't interfere with layout
- [ ] Touch events work correctly
- [ ] No zoom on double-tap

**Common Issues:**
- Address bar causing layout shift
- Display cutout overlap
- Touch event handling issues

### 4. Desktop 1440px (1440x900)

**Viewport:** 1440px × 900px  
**Device Category:** Desktop  
**Testing Checklist:**
- [ ] Two-panel layout (controls left, preview right)
- [ ] Windows open centered on screen
- [ ] Windows are draggable and resizable
- [ ] Multiple windows can be open simultaneously
- [ ] Windows don't overlap taskbar
- [ ] Title bars are always reachable
- [ ] Keyboard navigation works everywhere
- [ ] Tooltips appear on hover
- [ ] No layout stretching on wide monitors
- [ ] Max-width constraints enforced

**Common Issues:**
- Windows going off-screen
- Overlapping windows
- Layout stretching on ultrawide monitors
- Keyboard navigation not working

### 5. Keyboard-Only Navigation

**Viewport:** All  
**Testing Checklist:**
- [ ] Tab key navigates through all interactive elements
- [ ] Arrow keys navigate trait lists
- [ ] Enter key selects focused items
- [ ] Escape key closes modals/sheets/windows
- [ ] Focus indicators are visible
- [ ] Focus order is logical
- [ ] No keyboard traps
- [ ] Skip links work (if implemented)

**Common Issues:**
- Missing focus indicators
- Keyboard traps
- Focus order illogical
- Arrow keys not working in trait lists

## Documenting Issues

### Using the Issues Log

1. **Navigate to `/dev/qa`**
2. **Scroll to "Issues Log" section**
3. **Fill out the form:**
   - **Description:** Clear description of the issue
   - **Viewport:** Viewport size where issue occurs (e.g., "375x667")
   - **Status:** Must Fix or Acceptable
4. **Click "Add Issue"**

### Issue Status

- **Must Fix:** Critical issues that must be resolved before release
- **Acceptable:** Minor issues that can be deferred or are acceptable trade-offs
- **Fixed:** Issues that have been resolved (can be marked as fixed after verification)

### Issue Management

- **Update Status:** Use the dropdown in each issue to change status
- **Delete Issue:** Click "Delete" to remove resolved or invalid issues
- **Clear All:** Use "Clear All" button to remove all issues (use with caution)

### Issue Persistence

Issues are saved to `localStorage` and persist across page reloads. This allows you to:
- Document issues during testing
- Review issues later
- Track issue resolution

## Testing Workflow

### Step 1: Viewport Testing

1. Open browser DevTools
2. Set viewport to target size (e.g., iPhone SE: 375×667)
3. Navigate through the app
4. Test all major features
5. Document any issues found

### Step 2: Device Testing

1. Test on actual devices when possible:
   - iPhone SE (or similar small device)
   - iPhone Pro Max (or similar large device)
   - Android device (various sizes)
   - Desktop browser (1440px+)
2. Test real-world scenarios:
   - Slow network connections
   - Different browsers
   - Different orientations

### Step 3: Keyboard Navigation

1. Disconnect mouse/trackpad
2. Use only keyboard to navigate
3. Test all interactive elements
4. Verify focus indicators
5. Document accessibility issues

### Step 4: Performance Testing

1. Use browser DevTools Performance tab
2. Record interactions
3. Check for:
   - Layout thrashing
   - Forced reflows
   - Jank during animations
   - Memory leaks
4. Document performance issues

## Common Issues Reference

### Mobile Issues

| Issue | Status | Description |
|-------|--------|-------------|
| Bottom sheet overlap | Must Fix | Bottom sheet overlaps canvas content |
| Notch overlap | Must Fix | Content overlaps device notch |
| Home bar overlap | Must Fix | Content overlaps device home bar |
| Horizontal scroll | Must Fix | Page scrolls horizontally |
| Touch target too small | Must Fix | Touch targets < 44×44px |
| Window not fullscreen | Must Fix | Windows not fullscreen on mobile |

### Desktop Issues

| Issue | Status | Description |
|-------|--------|-------------|
| Window off-screen | Must Fix | Windows can be dragged off-screen |
| Overlapping windows | Acceptable | Windows overlap (if intentional) |
| Layout stretching | Must Fix | Layout stretches on ultrawide monitors |
| Keyboard navigation | Must Fix | Keyboard navigation not working |
| Missing focus indicators | Must Fix | No visible focus indicators |

### Performance Issues

| Issue | Status | Description |
|-------|--------|-------------|
| Layout thrashing | Must Fix | Layout recalculations causing jank |
| Forced reflows | Must Fix | Unnecessary layout reflows |
| Animation jank | Must Fix | Animations not smooth (60fps) |
| Memory leak | Must Fix | Memory usage increasing over time |

## Pre-Release Checklist

Before committing code, verify:

- [ ] All "Must Fix" issues resolved
- [ ] All viewports tested (iPhone SE, iPhone Pro Max, Android, Desktop)
- [ ] Keyboard navigation works everywhere
- [ ] No layout thrashing in performance trace
- [ ] No forced reflows
- [ ] All transitions are GPU-friendly (transform/opacity only)
- [ ] Safe-area insets respected on mobile
- [ ] No horizontal overflow
- [ ] Touch targets are adequate size
- [ ] Focus indicators visible
- [ ] Issues log reviewed and cleared (or documented)

## Notes

- Issues are stored in browser `localStorage` - they persist across sessions
- Clear issues after they're fixed to keep the log clean
- Use "Acceptable" status sparingly - only for truly minor issues
- Test on real devices when possible, not just browser DevTools
- Performance testing should be done on actual hardware, not just DevTools throttling

