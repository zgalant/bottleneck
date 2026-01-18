# Duplicate Shortcut Detection

This document explains how to detect and handle duplicate keyboard shortcuts in Bottleneck.

## Automatic Detection

When adding a new keyboard shortcut, Amp should:

1. **Parse the existing shortcuts** from both `keyboard.ts` and `KeyboardShortcutsModal.tsx`
2. **Check for conflicts** with the new shortcut being added
3. **Warn the user** if a duplicate is detected
4. **Ask for confirmation** before allowing the duplicate

## Key Detection Algorithm

### Extract Key Combinations

For each shortcut in `keyboard.ts`, extract:
- **Base key**: The character being pressed (`/`, `b`, `k`, etc.)
- **Modifiers**: Cmd/Ctrl, Shift, Alt
- **Description**: What the shortcut does

Example patterns to match:

```javascript
// Single key with modifiers
if (e.metaKey && e.key === "b" && !e.shiftKey) { }
// Cmd + B

if (e.metaKey && (e.key === "b" || e.key === "B") && e.shiftKey) { }
// Cmd + Shift + B

if (e.key === "/" && (e.metaKey || e.ctrlKey)) { }
// Cmd/Ctrl + /
```

### Normalize Shortcuts

Convert to canonical form for comparison:

```
Cmd+B → "Cmd+B"
Cmd+Shift+B → "Cmd+Shift+B"
Cmd+/ → "Cmd+/"
```

### Check for Conflicts

A conflict exists when:
- Same base key
- Same modifier combination (Cmd/Ctrl counts as the same)
- Case-insensitive for letters

Example conflicts:
- `Cmd+K` duplicates `Cmd+K` ❌
- `Cmd+B` duplicates `Cmd+B` ❌
- `Cmd+Shift+B` duplicates `Cmd+B` ✅ (different modifiers)
- `Cmd+k` duplicates `Cmd+K` ❌ (case-insensitive)

## User Flow When Duplicate Detected

### Scenario 1: Duplicate Found

```
User: I want to add a shortcut Cmd+K for "my new feature"

Amp detects: Cmd+K already exists for "Open command palette"

Amp shows:
┌─────────────────────────────────────────────────┐
│ ⚠️  Shortcut Conflict Detected                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Cmd+K is already used for:                      │
│ "Open command palette"                          │
│ (See: keyboard.ts:43)                           │
│                                                 │
│ Your new shortcut: "my new feature"             │
│                                                 │
│ Choose an option:                               │
│                                                 │
│ A) Use a different shortcut:                    │
│    • Cmd+Shift+K                                │
│    • Cmd+J                                      │
│                                                 │
│ B) Override (not recommended, requires review)  │
│                                                 │
│ C) Cancel                                       │
│                                                 │
└─────────────────────────────────────────────────┘

User selects: A) Cmd+Shift+K
```

### Scenario 2: No Conflict

```
User: I want to add a shortcut Cmd+Y for "my new feature"

Amp detects: No existing Cmd+Y shortcut

Amp shows:
┓ ✅ Shortcut is available
│ Cmd+Y can be used for "my new feature"
┗

Amp proceeds with implementation
```

## Suggested Alternatives

When a conflict is detected, suggest available alternatives:

```javascript
const suggestAlternatives = (baseKey, existingModifiers) => {
  const suggestions = [];
  const allModifiers = [
    [],
    ["Shift"],
    ["Alt"],
    ["Shift", "Alt"],
  ];
  
  for (const mods of allModifiers) {
    const combo = buildCombo(baseKey, mods);
    if (!isUsed(combo)) {
      suggestions.push(combo);
    }
  }
  
  return suggestions;
};
```

## Implementation Checklist

When Amp is asked to add a new keyboard shortcut, follow this sequence:

- [ ] **Parse existing shortcuts** from keyboard.ts and modal
- [ ] **Normalize the new shortcut** to canonical form
- [ ] **Check for duplicates** in the parsed list
- [ ] **If duplicate found:**
  - [ ] Show the conflict with existing shortcut name and location
  - [ ] Suggest 3-5 alternatives
  - [ ] Ask for confirmation with clear options
  - [ ] If user confirms override, add a comment in keyboard.ts explaining why
- [ ] **If no conflict:**
  - [ ] Proceed with implementation
  - [ ] Add shortcut to keyboard.ts
  - [ ] Add to uiStore.ts (if needed)
  - [ ] Add to KeyboardShortcutsModal.tsx
  - [ ] Verify no new conflicts introduced
  - [ ] Build and test

## Edge Cases

### Case 1: Similar Keys
```
Cmd+B vs Cmd+Shift+B → Different shortcuts, not a conflict
Cmd+K vs Cmd+Shift+K → Different shortcuts, not a conflict
```

### Case 2: Platform Differences
```
Cmd (macOS) vs Ctrl (Windows/Linux) → Same shortcut, conflicts
Both should be treated as "Cmd/Ctrl" when checking
```

### Case 3: Alt/Option Key
```
Cmd+Alt+B → Different from Cmd+B
Cmd+Alt+Shift+B → Different from all above
```

## Reference: Existing Shortcuts

| Shortcut | Action | File |
|----------|--------|------|
| Cmd+/ | Show keyboard shortcuts | keyboard.ts:50 |
| Cmd+K | Command palette | keyboard.ts:43 |
| Cmd+Shift+P | Command palette | keyboard.ts:36 |
| Cmd+B | Toggle sidebar | keyboard.ts:22 |
| Cmd+Shift+B | Toggle right panel | keyboard.ts:29 |
| Cmd+O | Open URLs palette | keyboard.ts:107 |
| Cmd+Shift+T | Toggle theme | keyboard.ts:57 |
| Cmd+Shift+D | Toggle diff view | keyboard.ts:64 |
| Cmd+Shift+W | Toggle whitespace | keyboard.ts:71 |
| Cmd+Shift+L | Toggle word wrap | keyboard.ts:78 |
| Cmd+Shift+A | Approve PR | keyboard.ts:85 |
| Cmd+Shift+C | Focus comment box | keyboard.ts:92 |
| Cmd+Shift+H | Go home | keyboard.ts:99 |
| Cmd+Left Arrow | Navigate back | keyboard.ts:114 |
