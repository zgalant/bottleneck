---
name: adding-keyboard-shortcuts
description: Adds keyboard shortcuts to Bottleneck following the complete pattern. Includes handler setup, state management, documentation, and duplicate detection. Use when adding new keyboard shortcuts to the app.
---

# Adding Keyboard Shortcuts to Bottleneck

Use this skill when implementing new keyboard shortcuts for Bottleneck.

## Complete Workflow

### 1. Define the Shortcut in keyboard.ts

Edit `src/renderer/utils/keyboard.ts` to add your shortcut handler. Follow this pattern:

```typescript
// In the handleKeyDown function, add your condition
if ((e.key === "x" || e.key === "X") && e.shiftKey) {
  e.preventDefault();
  useUIStore.getState().triggerYourAction();
  return;
}
```

**Key Points:**
- Use `e.metaKey || e.ctrlKey` for Cmd/Ctrl (works on macOS, Windows, Linux)
- Use `e.shiftKey`, `e.altKey` for modifier keys
- Always call `e.preventDefault()` before handling
- Return after handling to avoid propagation
- Follow the existing code style and comment conventions

**Example Shortcuts:**
- `Cmd + /` = Show keyboard shortcuts (`e.metaKey && e.key === "/"`)
- `Cmd + B` = Toggle sidebar (`(e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B") && !e.shiftKey`)
- `Cmd + Shift + A` = Approve PR (`(e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A") && e.shiftKey`)

### 2. Add UI Store Action (if needed)

If your shortcut needs to toggle state or dispatch an action, add it to `src/renderer/stores/uiStore.ts`:

```typescript
// In the UIState interface
yourNewAction: () => void;

// In the create() function
yourNewAction: () => {
  // Implement your action
  window.dispatchEvent(new CustomEvent("custom-event-name"));
},
```

### 3. Add to Keyboard Shortcuts Modal

Edit `src/renderer/components/KeyboardShortcutsModal.tsx` and add your shortcut to the `SHORTCUTS` array:

```typescript
const SHORTCUTS = [
  {
    category: "Your Category", // Or use existing category
    shortcuts: [
      // ... existing shortcuts
      { keys: ["Cmd", "Shift", "X"], description: "Your action description" },
    ],
  },
  // ...
];
```

**Key Points:**
- `keys` array should match your keyboard.ts implementation
- Description should be clear and user-friendly
- Add to appropriate category or create a new one
- **IMPORTANT:** Check for duplicate shortcuts before adding (see step 4)

### 4. Check for Duplicates

Before committing, verify no other shortcut uses the same key combination:

```bash
# Search for existing usage of your key combo
grep -r "Cmd.*Shift.*X" src/renderer/
```

**If a duplicate is found:**
1. Check the existing shortcut's purpose in keyboard.ts
2. Consider using a different modifier key (e.g., `Cmd+X` instead of `Cmd+Shift+X`)
3. Document why you need the conflict (if unavoidable) with a comment in keyboard.ts

### 5. Optional: Add IPC Handler for Menu Integration

If your shortcut should also be triggered from the macOS/Windows menu, add it to `src/main/menu.ts`:

```typescript
// In the menu structure
{
  label: "Your Action",
  accelerator: "CmdOrCtrl+Shift+X",
  click: () => {
    mainWindow.webContents.send("your-action-event");
  },
}
```

Then add the corresponding listener in `keyboard.ts`:

```typescript
const handleYourAction = () => {
  useUIStore.getState().yourNewAction();
};

window.electron.on("your-action-event", handleYourAction);

// Add to cleanup function
window.electron.off("your-action-event", handleYourAction);
```

## Checklist Before Submitting

- [ ] Handler added to `src/renderer/utils/keyboard.ts`
- [ ] Shortcut works with both Cmd (macOS) and Ctrl (Windows/Linux)
- [ ] `e.preventDefault()` called before handling
- [ ] New action added to `src/renderer/stores/uiStore.ts` (if needed)
- [ ] Shortcut documented in `KeyboardShortcutsModal.tsx`
- [ ] No duplicate key combinations (verified via grep)
- [ ] Description is clear and user-friendly
- [ ] Build succeeds: `npm run build`
- [ ] App starts: `npm run dev`
- [ ] Shortcut works when pressed in the app
- [ ] Modal shows the shortcut in the correct category

## Common Key Combinations Already Used

- `Cmd + /` → Show keyboard shortcuts
- `Cmd + K` / `Cmd + Shift + P` → Command palette
- `Cmd + B` → Toggle sidebar
- `Cmd + Shift + B` → Toggle right panel
- `Cmd + O` → Open URLs palette
- `Cmd + Shift + T` → Toggle theme
- `Cmd + Shift + D` → Toggle diff view
- `Cmd + Shift + W` → Toggle whitespace
- `Cmd + Shift + L` → Toggle word wrap
- `Cmd + Shift + A` → Approve PR
- `Cmd + Shift + C` → Focus comment box
- `Cmd + Shift + H` → Go to home (PR list)
- `Cmd + Left Arrow` → Navigate back

**Avoid these combinations** or ask for confirmation if overriding is necessary.

## File Locations

| File | Purpose |
|------|---------|
| `src/renderer/utils/keyboard.ts` | Keyboard event handlers |
| `src/renderer/stores/uiStore.ts` | State management for actions |
| `src/renderer/components/KeyboardShortcutsModal.tsx` | User-facing documentation |
| `src/main/menu.ts` | Menu integration (optional) |

## Testing

After adding your shortcut:

1. **Build the app:** `npm run build`
2. **Start dev mode:** `npm run dev`
3. **Press the shortcut:** Verify it works
4. **Check the modal:** Press `Cmd + /` and verify your shortcut appears
5. **Check for conflicts:** Press other similar shortcuts to ensure no interference

## Example: Add "Cmd + Shift + G" to Toggle Something

### Step 1: keyboard.ts
```typescript
// Toggle something (Cmd/Ctrl + Shift + G)
if ((e.key === "g" || e.key === "G") && e.shiftKey) {
  e.preventDefault();
  useUIStore.getState().toggleSomething();
  return;
}
```

### Step 2: uiStore.ts
```typescript
// In UIState interface
toggleSomething: () => void;

// In create() function
toggleSomething: () =>
  set((state) => ({ somethingOpen: !state.somethingOpen })),
```

### Step 3: KeyboardShortcutsModal.tsx
```typescript
{
  category: "View Settings",
  shortcuts: [
    // ... existing
    { keys: ["Cmd", "Shift", "G"], description: "Toggle something" },
  ],
}
```

### Step 4: Verify
```bash
# Check for duplicates
grep -E "Cmd.*Shift.*G|Ctrl.*Shift.*G" src/renderer/ src/main/

# Build and test
npm run build
npm run dev
# Press Cmd+Shift+G in the app
# Press Cmd+/ to open modal and verify shortcut is documented
```

## Why This Matters

- **Consistency:** All shortcuts follow the same pattern
- **User Discoverability:** The modal documents all shortcuts in one place
- **Platform Support:** Cmd (macOS) and Ctrl (Windows/Linux) both work
- **Reliability:** Proper event handling prevents conflicts
- **Documentation:** Future developers know where to find shortcut code
