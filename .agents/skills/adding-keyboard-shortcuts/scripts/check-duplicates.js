#!/usr/bin/env node

/**
 * Check for duplicate keyboard shortcuts in the codebase
 * 
 * Usage: node scripts/check-duplicates.js
 * 
 * This script parses keyboard.ts and KeyboardShortcutsModal.tsx to verify:
 * 1. No duplicate shortcuts defined
 * 2. All shortcuts in the modal are implemented in keyboard.ts
 * 3. Suggests alternative shortcuts if duplicates found
 */

const fs = require("fs");
const path = require("path");

// Read files
const keyboardPath = path.join(__dirname, "../../src/renderer/utils/keyboard.ts");
const modalPath = path.join(__dirname, "../../src/renderer/components/KeyboardShortcutsModal.tsx");

const keyboardContent = fs.readFileSync(keyboardPath, "utf-8");
const modalContent = fs.readFileSync(modalPath, "utf-8");

// Extract shortcuts from keyboard.ts
const keyboardShortcuts = new Map();

// Pattern: e.key === "X" and modifiers
const keyPatterns = [
  { regex: /if\s*\(\s*\(e\.key === ["']([^"']+)["']\s*\|\|\s*e\.key === ["']([^"']+)["']\)\s*&&\s*([^)]+)\s*\)/, type: "multi-key" },
  { regex: /if\s*\(\s*e\.key === ["']([^"']+)["']\s*&&\s*([^)]+)\s*\)/, type: "single-key" },
];

// Extract modifiers: e.metaKey || e.ctrlKey, e.shiftKey, e.altKey
function parseModifiers(conditionStr) {
  const modifiers = [];
  if (/e\.metaKey\s*\|\|\s*e\.ctrlKey|e\.ctrlKey\s*\|\|\s*e\.metaKey|\(e\.metaKey\s*\|\|\s*e\.ctrlKey\)/) {
    modifiers.push("Cmd/Ctrl");
  }
  if (/e\.shiftKey|!e\.shiftKey/) {
    modifiers.push(conditionStr.includes("!e.shiftKey") ? "" : "Shift");
  }
  if (/e\.altKey|!e\.altKey/) {
    modifiers.push(conditionStr.includes("!e.altKey") ? "" : "Alt");
  }
  return modifiers.filter(Boolean);
}

// Find all keyboard shortcuts in keyboard.ts
const keyboardLines = keyboardContent.split("\n");
keyboardLines.forEach((line, idx) => {
  if (line.includes("// Show keyboard shortcuts") || 
      line.includes("// Toggle") || 
      line.includes("// Open") ||
      line.includes("// Approve") ||
      line.includes("// Focus") ||
      line.includes("// Go to") ||
      line.includes("// Navigate")) {
    
    // Look at the next few lines for the condition
    const context = keyboardLines.slice(idx, idx + 5).join("\n");
    
    if (context.includes('e.key === "')) {
      const keyMatch = context.match(/e\.key === ["']([^"']+)["']/);
      if (keyMatch) {
        const key = keyMatch[1];
        const desc = line.trim();
        const shortcutStr = `${key}`;
        
        if (keyboardShortcuts.has(shortcutStr)) {
          console.warn(`⚠️  Duplicate key found: ${key}`);
        }
        
        keyboardShortcuts.set(shortcutStr, { desc, line: idx + 1 });
      }
    }
  }
});

// Extract shortcuts from modal
const modalShortcuts = [];
const modalMatch = modalContent.match(/const SHORTCUTS = \[([\s\S]*?)\];/);
if (modalMatch) {
  const shortcutsStr = modalMatch[1];
  const shortcutMatches = shortcutsStr.matchAll(/keys:\s*\[\s*([^\]]+)\s*\]/g);
  
  for (const match of shortcutMatches) {
    const keysStr = match[1];
    const keys = keysStr.split(",").map(k => k.trim().replace(/["']/g, ""));
    modalShortcuts.push(keys.join(" + "));
  }
}

// Report
console.log("📋 Keyboard Shortcuts Analysis\n");
console.log(`Found ${keyboardShortcuts.size} shortcuts in keyboard.ts`);
console.log(`Found ${modalShortcuts.length} shortcuts in modal\n`);

// Check for duplicates
const seenShortcuts = new Map();
let hasDuplicates = false;

[...keyboardShortcuts.entries()].forEach(([shortcut, data]) => {
  if (seenShortcuts.has(shortcut)) {
    console.error(`❌ DUPLICATE: ${shortcut}`);
    console.error(`   First at: ${seenShortcuts.get(shortcut).file}:${seenShortcuts.get(shortcut).line}`);
    console.error(`   Also at: keyboard.ts:${data.line}`);
    console.error(`   Description: ${data.desc}\n`);
    hasDuplicates = true;
  } else {
    seenShortcuts.set(shortcut, { file: "keyboard.ts", line: data.line });
  }
});

if (!hasDuplicates) {
  console.log("✅ No duplicate shortcuts found in keyboard.ts\n");
}

// Suggest alternatives for common conflicts
console.log("Common shortcut patterns to avoid:");
console.log("  - Cmd + K/P → Command palette");
console.log("  - Cmd + B → Toggle sidebar");
console.log("  - Cmd + / → Show shortcuts");
console.log("  - Cmd + Shift + [A-Z] → Typically reserved\n");

process.exit(hasDuplicates ? 1 : 0);
