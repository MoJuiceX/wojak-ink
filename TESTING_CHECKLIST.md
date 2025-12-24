# Testing Checklist - Desktop Icons & Hover Effects

## 🎯 Recent Changes to Test (Hover Effects & Borders)

### Desktop Icons (Left Sidebar)
- [ ] **Hover Effect**: Hover over any desktop icon (README.TXT, Wojak Generator, etc.)
  - [ ] Subtle white background (`rgba(255, 255, 255, 0.1)`) appears on hover
  - [ ] No border/stroke appears on hover
  - [ ] Hover effect disappears when mouse leaves
  - [ ] Works on all icon types (main icons, games, links)

### Desktop Image Icons (Downloaded Wojaks)
- [ ] **No Border on Hover**: Hover over a downloaded Wojak image icon
  - [ ] No border appears around the thumbnail on hover
  - [ ] Subtle white background appears on the button (same as desktop icons)
  - [ ] Image thumbnail itself has no border when not selected

- [ ] **Selection Border**: Click to select a downloaded image icon
  - [ ] Blue border (`2px solid var(--accent)`) appears around thumbnail when selected
  - [ ] Selection background (`rgba(0, 0, 128, 0.3)`) appears
  - [ ] Border disappears when deselected

- [ ] **Hover + Selection**: Hover over a selected image icon
  - [ ] Selection border remains visible
  - [ ] Hover background still appears
  - [ ] Both effects work together correctly

### Recycle Bin
- [ ] **Hover Effect**: Hover over the Recycle Bin icon
  - [ ] Subtle white background appears (same as other desktop icons)
  - [ ] No border appears on hover
  - [ ] Icon remains visible and readable

- [ ] **Drag Over Effect**: Drag an image icon over the Recycle Bin
  - [ ] Red background (`rgba(255, 0, 0, 0.3)`) appears
  - [ ] Red dashed border appears
  - [ ] Red glow effect on icon appears
  - [ ] Effects disappear when drag leaves the bin

- [ ] **Hover vs Drag Over**: 
  - [ ] Normal hover (white background) works when not dragging
  - [ ] Drag over (red background) takes priority when dragging
  - [ ] Transitions smoothly between states

---

## 🔍 General Desktop Icon Functionality

### Desktop Icons (Left Sidebar)
- [ ] **Clicking**: Single-click on any desktop icon
  - [ ] Click sound plays
  - [ ] No action occurs (correct behavior)

- [ ] **Double-Clicking**: Double-click on any desktop icon
  - [ ] Window opens (or external link opens)
  - [ ] Click sound plays
  - [ ] Window appears in correct position

- [ ] **Icon Labels**: 
  - [ ] All icons show correct labels
  - [ ] Labels are readable (white text with shadow)
  - [ ] Long labels truncate with ellipsis

- [ ] **Icon Images**:
  - [ ] All icons display correctly
  - [ ] Icons are pixelated (Win98 style)
  - [ ] No broken images

### Desktop Image Icons (Downloaded Wojaks)
- [ ] **Display**: 
  - [ ] Downloaded images appear on desktop
  - [ ] Thumbnails show correct images
  - [ ] Labels show correct filenames
  - [ ] Long filenames truncate with ellipsis

- [ ] **Positioning**:
  - [ ] Images can be dragged to new positions
  - [ ] Positions persist after page refresh
  - [ ] Images don't overlap with desktop icons

- [ ] **Selection**:
  - [ ] Single-click selects one image
  - [ ] Shift+Click or Cmd+Click selects multiple
  - [ ] Clicking empty space deselects all
  - [ ] Selected images show blue border and background

- [ ] **Double-Click**:
  - [ ] Double-click opens image in viewer
  - [ ] Viewer displays full-size image
  - [ ] Viewer can be closed

- [ ] **Context Menu** (Right-click):
  - [ ] Context menu appears
  - [ ] "Open" option works
  - [ ] "Download" option works
  - [ ] "Delete" option works
  - [ ] Menu closes on click outside

- [ ] **Dragging**:
  - [ ] Images can be dragged around desktop
  - [ ] Dragging shows visual feedback (opacity change)
  - [ ] Cursor changes to "grabbing" while dragging
  - [ ] Images snap to grid or move freely (check behavior)

- [ ] **Drag to Recycle Bin**:
  - [ ] Dragging image over bin shows red feedback
  - [ ] Dropping image in bin deletes it
  - [ ] Recycle Bin sound plays
  - [ ] Image disappears from desktop
  - [ ] Works with single and multiple selections

### Recycle Bin
- [ ] **Icon States**:
  - [ ] Shows empty icon when bin is empty
  - [ ] Shows full icon when bin has items
  - [ ] Icon updates correctly when items added/removed

- [ ] **Double-Click**:
  - [ ] Double-click opens Recycle Bin window
  - [ ] Window shows deleted items
  - [ ] Window can be closed

- [ ] **Context Menu** (Right-click):
  - [ ] Context menu appears
  - [ ] "Open" option works
  - [ ] "Empty Recycle Bin" option works (if implemented)

---

## 🎨 Visual Consistency Tests

### All Desktop Icons
- [ ] **No Borders**: 
  - [ ] No borders appear on any desktop icon (regular, image, or Recycle Bin)
  - [ ] No borders on hover (except selection border for images)
  - [ ] No borders on focus
  - [ ] No borders on active state

- [ ] **Hover Consistency**:
  - [ ] All icons use same hover background (`rgba(255, 255, 255, 0.1)`)
  - [ ] Hover effect appears/disappears smoothly
  - [ ] No flickering or janky transitions

- [ ] **Text Readability**:
  - [ ] All labels are readable (white text with shadow)
  - [ ] Text remains readable on hover
  - [ ] Text remains readable when selected

- [ ] **Icon Sizes**:
  - [ ] Regular desktop icons: 32x32px
  - [ ] Image thumbnails: 48x48px
  - [ ] Recycle Bin icon: 32x32px
  - [ ] All icons maintain aspect ratio

---

## 🧪 Edge Cases & Error Handling

### Desktop Image Icons
- [ ] **Broken Images**:
  - [ ] Image fails to load → shows "Failed to load" message
  - [ ] Error handling doesn't break layout
  - [ ] Icon can still be deleted

- [ ] **Multiple Selections**:
  - [ ] Can select multiple images
  - [ ] Dragging one selected image moves all selected
  - [ ] Deleting one selected image removes all selected
  - [ ] Selection persists during drag

- [ ] **Overlapping Icons**:
  - [ ] Icons can be positioned to overlap
  - [ ] Top icon receives click events
  - [ ] Dragging works correctly with overlaps

- [ ] **Window Resize**:
  - [ ] Recycle Bin stays in bottom-right corner
  - [ ] Desktop icons stay in left sidebar
  - [ ] Image icons maintain positions (or adjust if needed)

### Recycle Bin
- [ ] **Empty State**:
  - [ ] Shows empty icon when no items
  - [ ] Hover effect still works when empty
  - [ ] Can't drag items to empty bin (or can, but nothing happens)

- [ ] **Full State**:
  - [ ] Shows full icon when items present
  - [ ] Icon updates immediately when item added
  - [ ] Icon updates immediately when bin emptied

---

## 🌐 Cross-Browser & Responsive Tests

### Browser Compatibility
- [ ] **Chrome/Edge**: All features work
- [ ] **Safari**: All features work (especially important for Mac)
- [ ] **Firefox**: All features work
- [ ] **Mobile Safari**: Touch interactions work

### Responsive Design
- [ ] **Desktop (>640px)**: 
  - [ ] All icons display correctly
  - [ ] Hover effects work with mouse
  - [ ] Layout doesn't break

- [ ] **Mobile (≤640px)**:
  - [ ] Icons are touch-friendly
  - [ ] Touch targets are large enough
  - [ ] No hover effects interfere with touch
  - [ ] Layout adapts correctly

---

## 🔊 Sound & Feedback Tests

- [ ] **Click Sounds**:
  - [ ] Click sound plays on desktop icon click
  - [ ] Click sound plays on Recycle Bin click
  - [ ] Sound volume is appropriate

- [ ] **Recycle Bin Sound**:
  - [ ] Recycle Bin sound plays when item deleted
  - [ ] Sound plays once per delete operation
  - [ ] Sound doesn't play multiple times for single delete

---

## 🐛 Regression Tests

### Previous Functionality Still Works
- [ ] **Window System**:
  - [ ] Opening windows from desktop icons works
  - [ ] Window stacking/z-index works
  - [ ] Window dragging works
  - [ ] Window resizing works

- [ ] **Wojak Generator**:
  - [ ] Can generate Wojaks
  - [ ] Can export to desktop
  - [ ] Exported images appear correctly

- [ ] **Gallery**:
  - [ ] Gallery opens correctly
  - [ ] Images load correctly
  - [ ] No layout breaking

- [ ] **Other Windows**:
  - [ ] All windows open/close correctly
  - [ ] No console errors
  - [ ] No visual glitches

---

## ✅ Quick Smoke Test (5 minutes)

If you're short on time, test these critical items:

1. [ ] Hover over a desktop icon → white background appears, no border
2. [ ] Hover over a downloaded image → white background appears, no border
3. [ ] Click to select an image → blue border appears
4. [ ] Hover over Recycle Bin → white background appears, no border
5. [ ] Drag image over Recycle Bin → red background appears
6. [ ] Drop image in Recycle Bin → image deletes, sound plays
7. [ ] Double-click desktop icon → window opens
8. [ ] Double-click image → image viewer opens
9. [ ] No console errors appear
10. [ ] All icons remain readable and functional

---

## 📝 Notes Section

Use this space to document any issues found:

**Issue 1:**
- Description: 
- Steps to reproduce:
- Expected behavior:
- Actual behavior:

**Issue 2:**
- Description:
- Steps to reproduce:
- Expected behavior:
- Actual behavior:

---

## 🎯 Priority Levels

- **P0 (Critical)**: Must work or site is broken
- **P1 (High)**: Important feature, should work
- **P2 (Medium)**: Nice to have, can be fixed later

Mark each test with priority if issues are found:
- [ ] Test name [P0/P1/P2]

---

*Last Updated: After desktop icon hover effects implementation*

