# Redesign User Menu - Submenu Organization & Scalability

## Summary

Reorganize the user menu dropdown to support scalable growth by grouping related features into submenus. Currently, Import/Export and Experimental Features are top-level items, which will clutter the menu as more features are added.

## Current Menu Structure (Desktop)

```
┌─────────────────────────────┐
│ Signed in as                │
│ user@example.com            │
├─────────────────────────────┤
│ [Theme Toggle]              │
├─────────────────────────────┤
│ ↓ Export Data               │
│ ↑ Import Data               │
│ 💳 Import Bank Transactions │
│ ⚗️ Experimental Features    │
├─────────────────────────────┤
│ Logout                      │
└─────────────────────────────┘
```

## Problems

1. **Flat structure doesn't scale**: As experimental features grow, the menu becomes cluttered
2. **Import/Export separation**: Export and Import are related but separated
3. **Inconsistent grouping**: Bank Import is separate from regular Import
4. **No visual hierarchy**: All actions have equal visual weight

## Proposed Design

### Option 1: Collapsible Submenus (Recommended)

```
┌─────────────────────────────────────┐
│ Signed in as                        │
│ user@example.com                    │
├─────────────────────────────────────┤
│ [Theme Toggle: Light/Dark/System]   │
├─────────────────────────────────────┤
│ > Import/Export                  ⌄  │ ← Expandable section
│ > ⚗️ Experimental                ⌄  │ ← Expandable section
│ Settings                            │
├─────────────────────────────────────┤
│ Logout                              │
└─────────────────────────────────────┘
```

**When "Import/Export" is expanded:**

```
┌─────────────────────────────────────┐
│ > Import/Export                  ⌃  │ ← Collapses
│   ├ ↓ Export Financial Data         │
│   ├ ↑ Import Financial Data         │
│   └ 💳 Import Bank Transactions     │
│ > ⚗️ Experimental                ⌄  │
│ Settings                            │
├─────────────────────────────────────┤
│ Logout                              │
└─────────────────────────────────────┘
```

**When "Experimental" is expanded:**

```
┌─────────────────────────────────────┐
│ > Import/Export                  ⌄  │
│ > ⚗️ Experimental                ⌃  │ ← Collapses
│   ├ 🗑️ Delete All Data              │
│   └ [Future features will go here]  │
│ Settings                            │
├─────────────────────────────────────┤
│ Logout                              │
└─────────────────────────────────────┘
```

### Option 2: Hover Submenus (Not Recommended for Mobile)

Hovering over "Import/Export" shows flyout submenu (like macOS menu bar). **Problem**: Doesn't work well on touch devices.

### Option 3: Separate Modals (Current Approach)

Keep current flat menu but each section opens a dedicated modal (like Experimental Features already does). **Problem**: Extra click for simple actions.

## Recommended Approach: Option 1

**Benefits:**

-   Scales well as features are added
-   Groups related functionality
-   Works on both desktop and mobile
-   One-click access to common actions (no modal needed)
-   Clear visual hierarchy

**Implementation:**

-   Each submenu collapses/expands on click
-   Only one submenu open at a time
-   Smooth transition animations
-   Persists state (localStorage) so frequent actions stay expanded

## Technical Implementation

### Desktop Menu ([Header.jsx](frontend/src/components/Header.jsx))

**Add State:**

```jsx
const [expandedSubmenu, setExpandedSubmenu] = useState(null); // 'import-export' | 'experimental' | null
```

**Submenu Component:**

```jsx
const SubmenuButton = ({ icon, label, isExpanded, onClick, children }) => (
    <>
        <button
            onClick={onClick}
            className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center justify-between"
        >
            <div className="flex items-center gap-2">
                {icon}
                {label}
            </div>
            <svg
                className={`w-4 h-4 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </button>
        {isExpanded && (
            <div className="bg-gray-50 dark:bg-dark-elevated border-l-2 border-bloom-pink dark:border-dark-pink ml-4 my-1">
                {children}
            </div>
        )}
    </>
);
```

**Menu Structure:**

```jsx
<div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-gray-200 dark:border-dark-border py-2 z-50">
    {/* User Info */}
    <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
        <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
            Signed in as
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">
            {localStorage.getItem("user_email")}
        </p>
    </div>

    {/* Theme Toggle */}
    <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border">
        <ThemeToggle />
    </div>

    {/* Import/Export Submenu */}
    <SubmenuButton
        icon={<svg>...</svg>}
        label="Import/Export"
        isExpanded={expandedSubmenu === "import-export"}
        onClick={() =>
            setExpandedSubmenu(
                expandedSubmenu === "import-export" ? null : "import-export"
            )
        }
    >
        <button
            onClick={onExport}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
        >
            ↓ Export Financial Data
        </button>
        <button
            onClick={onImport}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
        >
            ↑ Import Financial Data
        </button>
        <button
            onClick={onBankImport}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-border"
        >
            💳 Import Bank Transactions
        </button>
    </SubmenuButton>

    {/* Experimental Features Submenu */}
    {onShowExperimental && (
        <SubmenuButton
            icon={<svg>...</svg>}
            label="⚗️ Experimental"
            isExpanded={expandedSubmenu === "experimental"}
            onClick={() =>
                setExpandedSubmenu(
                    expandedSubmenu === "experimental" ? null : "experimental"
                )
            }
        >
            <button
                onClick={() => {
                    onShowExperimental();
                    setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
                🗑️ Delete All Data
            </button>
            {/* Future experimental features */}
        </SubmenuButton>
    )}

    {/* Settings (placeholder for future) */}
    <button
        onClick={() => {
            navigate("/settings");
            setShowUserMenu(false);
        }}
        className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2"
    >
        <svg>...</svg>
        Settings
    </button>

    {/* Logout */}
    <button
        onClick={handleLogout}
        className="w-full text-left px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated transition flex items-center gap-2 border-t border-gray-200 dark:border-dark-border mt-2 pt-2"
    >
        <svg>...</svg>
        Logout
    </button>
</div>
```

### Mobile Menu ([Dashboard.jsx](frontend/src/pages/Dashboard.jsx))

Same collapsible submenu approach, but integrated into mobile drawer menu. Mobile already has more space, so submenus feel natural.

### Experimental Features Modal Changes

**Current:** Modal shows toggle + Delete All button
**Proposed:** Modal only shows feature toggles, Delete All moved to menu

**Modal Content:**

```
┌────────────────────────────────────┐
│ ⚗️ Experimental Features           │
├────────────────────────────────────┤
│ Feature Flags:                     │
│ ┌────────────────────────────────┐ │
│ │ ✓ Enable Experimental Features │ │
│ │ [ ] Future Feature 1           │ │
│ │ [ ] Future Feature 2           │ │
│ └────────────────────────────────┘ │
│                                    │
│ Destructive actions are in the    │
│ User Menu under "Experimental"     │
└────────────────────────────────────┘
```

## Future Scalability

As experimental features grow, easily add to submenu:

```jsx
<SubmenuButton label="⚗️ Experimental" ...>
  <button>🗑️ Delete All Data</button>
  <button>🧪 Enable Beta Features</button>
  <button>📊 Advanced Analytics</button>
  <button>🔧 Developer Tools</button>
</SubmenuButton>
```

## User Experience Improvements

### Before (Current):

-   User wants to export data
-   Clicks avatar → Click "Export Data"
-   **2 clicks**

### After (First Time):

-   User wants to export data
-   Clicks avatar → Click "Import/Export" → Click "Export Financial Data"
-   **3 clicks**

### After (Submenu Expanded):

-   User wants to export data (submenu already expanded from previous use)
-   Clicks avatar → Click "Export Financial Data"
-   **2 clicks** (same as before)

## Migration Plan

### Phase 1: Desktop Menu

1. Create `SubmenuButton` component
2. Group Import/Export actions
3. Group Experimental actions
4. Test on all screen sizes

### Phase 2: Mobile Menu

1. Apply same submenu logic to mobile drawer
2. Ensure touch-friendly spacing
3. Test on mobile devices

### Phase 3: Experimental Modal

1. Move "Delete All" from modal to menu
2. Simplify modal to feature flags only
3. Update documentation

### Phase 4: Future Features

1. Add Settings page/submenu
2. Add more experimental features as needed
3. Monitor menu height/scrolling

## Design Considerations

### Colors

-   Expanded submenu: Light gray background (`bg-gray-50 dark:bg-dark-elevated`)
-   Active item: Pink accent border-left (`border-bloom-pink`)
-   Destructive actions: Red text (`text-red-600`)

### Spacing

-   Submenu items: Smaller padding (py-2 instead of py-3)
-   Indented: `ml-4` with left border accent
-   Parent item: Same size as current menu items

### Animations

-   Submenu expansion: 150ms ease-in-out
-   Chevron rotation: 150ms ease-in-out
-   Hover states: 100ms

## Files to Modify

-   [frontend/src/components/Header.jsx](frontend/src/components/Header.jsx) - Desktop menu
-   [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) - Mobile menu (lines 900-1050)
-   [frontend/src/components/ExperimentalFeaturesModal.jsx](frontend/src/components/ExperimentalFeaturesModal.jsx) - Remove Delete All from modal

## Success Criteria

-   [ ] Desktop menu supports collapsible submenus
-   [ ] Mobile menu supports collapsible submenus
-   [ ] Only one submenu open at a time
-   [ ] Smooth animations
-   [ ] Touch-friendly on mobile
-   [ ] Import/Export grouped together
-   [ ] Experimental features easily extendable
-   [ ] No visual regression
-   [ ] Menu doesn't overflow viewport

## Priority

**Medium** - Quality of life improvement, sets foundation for future features

## Labels

-   `enhancement`
-   `ui-ux`
-   `frontend`

## Related Components

-   User Menu dropdown
-   Mobile navigation drawer
-   Experimental Features modal
-   Theme Toggle
