# Mobile Generator Canvas Padding Audit

## Summary
Audited and standardized the mobile generator canvas padding logic to use a CSS variable for the collapsed bottom sheet height.

## Changes Made

### 1. Added CSS Variable (`src/styles/layout.css`)
- **Variable**: `--mobile-sheet-collapsed-height`
- **Value**: `calc(140px + var(--safe-area-inset-bottom))`
- **Location**: Mobile breakpoint section (≤ 640px)
- **Calculation Breakdown**:
  - `.sheet-collapsed` padding top: `var(--spacing-md)` = 8px
  - `.primary-buttons` (3 buttons, min-height 60px): 60px
  - Gap between sections: `var(--spacing-md)` = 8px
  - `.export-controls-mobile`: padding 6px + button 44px + padding 6px = ~56px
  - `.sheet-collapsed` padding bottom: `var(--spacing-md)` = 8px
  - Sheet `padding-bottom` (safe area): `var(--safe-area-inset-bottom)`
  - **Total**: 8 + 60 + 8 + 56 + 8 = 140px + safe-area

### 2. Updated Bottom Sheet CSS (`src/components/meme/MobileTraitBottomSheet.css`)
- Added explicit height to `.mobile-trait-sheet.collapsed` using the CSS variable
- Ensures collapsed state always matches the calculated height
- Removed duplicate/conflicting collapsed state rule

### 3. Updated Canvas Padding (`src/components/windows/WojakCreator.jsx`)
- **Before**: Hardcoded `paddingBottom: 'calc(var(--spacing-md) + 140px)'`
- **After**: `paddingBottom: 'calc(var(--spacing-md) + var(--mobile-sheet-collapsed-height, calc(140px + var(--safe-area-inset-bottom))))'`
- **Benefits**:
  - Single source of truth for collapsed sheet height
  - Automatically accounts for safe-area insets
  - Fallback value ensures compatibility

## Verification

### Canvas Padding Calculation
The canvas now reserves space equal to:
- Base padding: `var(--spacing-md)` (8px on mobile)
- Collapsed sheet height: `var(--mobile-sheet-collapsed-height)` (140px + safe-area)
- **Total reserved space**: 8px + 140px + safe-area = 148px + safe-area

### Consistency Check
- ✅ CSS variable defined in `layout.css` (mobile breakpoint)
- ✅ Bottom sheet uses variable for collapsed height
- ✅ Canvas padding uses same variable
- ✅ Safe-area insets properly included in calculation

## Files Modified
1. `src/styles/layout.css` - Added `--mobile-sheet-collapsed-height` variable
2. `src/components/meme/MobileTraitBottomSheet.css` - Updated collapsed state height
3. `src/components/windows/WojakCreator.jsx` - Updated canvas padding calculation

## Testing Recommendations
1. Test on iPhone (with notch) - verify safe-area is respected
2. Test on Android - verify 140px base height works correctly
3. Test canvas doesn't overlap bottom sheet when collapsed
4. Test canvas spacing when sheet is expanded (should be same or more)
5. Verify no layout shift when safe-area insets change (device rotation)


