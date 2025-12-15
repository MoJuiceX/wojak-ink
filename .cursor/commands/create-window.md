# Create New Window

Create a new window component following the project's patterns and guidelines.

## Usage

Use this command when you want to add a new window to the application.

## What This Command Does

1. **Creates the window component file** in `src/components/windows/`
2. **Generates boilerplate code** using the base `Window` component
3. **Adds integration code** for `App.jsx` (import, state, render)
4. **Provides taskbar integration** template (if needed)
5. **Reminds about README updates**

## Required Information

When using this command, provide:
- **Window name** (e.g., "Stats", "Settings", "About")
- **Window title** (UPPERCASE, e.g., "STATISTICS", "SETTINGS")
- **Window purpose** (what it displays/does)
- **Features needed** (API calls, forms, lists, etc.)
- **Positioning** (where it should appear on screen)

## Example Usage

```
/create-window

Window Name: Stats
Window Title: STATISTICS
Purpose: Display NFT collection statistics
Features: Fetch data from API, show loading state, display metrics
Position: left: 100px, top: 100px
```

## Generated Files

1. **Window Component**: `src/components/windows/[Name]Window.jsx`
   - Uses base `Window` component
   - Includes proper styling
   - Follows Windows 98 UI patterns

2. **App.jsx Integration**:
   - Import statement
   - State management (if needed)
   - Render code

3. **Taskbar Integration** (if requested):
   - Button code for taskbar

## Follow-Up Steps

After creating the window:

1. **Test the window**:
   - Opens/closes correctly
   - Minimize/maximize works
   - Dragging works
   - No console errors

2. **Add functionality**:
   - Implement features
   - Add API calls if needed
   - Add error handling
   - Add loading states

3. **Update README.md**:
   - Add to Features section
   - Add usage instructions
   - Use `/update-readme` command

4. **Test on Mac**:
   - Verify everything works
   - Check browser console
   - Test all interactions

## Window Types

### Simple Display Window
- Shows static content
- No API calls
- No forms

### Data Window
- Fetches data from API
- Shows loading state
- Handles errors
- Displays data

### Form Window
- Contains form inputs
- Handles form submission
- Validates input
- Shows success/error messages

### Modal Window
- Opens on user action
- Blocks interaction with other windows
- Has close button

## Styling Guidelines

- **Default width**: 800px
- **Max width**: `calc(100vw - 40px)` (responsive)
- **Default position**: `left: 20px, top: 20px`
- **Use 98.css classes**: `.window`, `.title-bar`, `.window-body`
- **Windows 98 colors**: `#c0c0c0`, `#d4d0c8`, etc.

## Common Patterns

### Window with API Data
```javascript
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)

useEffect(() => {
  if (isOpen) {
    fetchData()
  }
}, [isOpen])
```

### Window with Form
```javascript
const [formData, setFormData] = useState({})

const handleSubmit = (e) => {
  e.preventDefault()
  onSubmit(formData)
  onClose()
}
```

### Window with State
```javascript
const [state, setState] = useState(initialValue)

const handleAction = () => {
  setState(newValue)
}
```

## Remember

- ✅ Use base `Window` component
- ✅ Follow Windows 98 UI patterns
- ✅ Test on Mac
- ✅ Update README.md
- ✅ Handle errors gracefully
- ✅ Prevent event handler conflicts
- ✅ Keep beginner-friendly (for Abit)

