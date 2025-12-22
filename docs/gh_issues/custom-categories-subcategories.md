# Custom Categories & Subcategories

**Labels:** `feature`, `backend`, `frontend`, `ui-ux`, `priority: medium`
**Milestone:** v2.0 - Core Features

## Overview

Allow users to create, edit, and delete their own expense categories and subcategories for personalized budget tracking.

## Problem

Currently, categories and subcategories are hardcoded in the system. Users have different spending patterns and need flexibility to organize expenses according to their personal needs.

## Features

### Category Management

-   **Create custom categories**

    -   Name (required)
    -   Icon/emoji selector
    -   Color picker for UI differentiation
    -   Default vs. custom flag (protect system categories)

-   **Edit categories**

    -   Update name, icon, color
    -   Cannot edit system default categories

-   **Delete categories**
    -   Soft delete (preserve historical data)
    -   Reassign existing expenses to another category
    -   Confirmation modal with expense count

### Subcategory Management

-   **Create subcategories** under any category (system or custom)

    -   Name (required)
    -   Parent category
    -   Optional description

-   **Edit/Delete subcategories**
    -   Same protections as categories
    -   Reassignment flow for expenses

### System Categories

**Protected categories** that cannot be deleted (can be hidden):

-   Goal Contribution (needed for goals feature)
-   Income (system requirement)
-   Debt Payment (if implemented)

### UI/UX

**Settings Page:**

```
Settings → Categories
├─ [+ New Category]
│
├─ 🍔 Food & Dining (Default)
│   ├─ Groceries
│   ├─ Restaurants
│   ├─ [+ Add Subcategory]
│   └─ [Cannot delete - System category]
│
├─ 🎮 Gaming (Custom) [Edit] [Delete]
│   ├─ Steam
│   ├─ Xbox Game Pass
│   └─ [+ Add Subcategory]
│
└─ 🎯 Goal Contribution (System)
    └─ [Auto-populated from active goals]
```

**Expense Form:**

-   Category dropdown shows system + custom categories
-   Subcategory dropdown filters by selected category
-   Quick "Create new" option in dropdown

## Database Changes

### Categories Table

```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,  -- NULL for system categories
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Subcategories Table

```sql
CREATE TABLE subcategories (
    id INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    user_id INTEGER,  -- NULL for system subcategories
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Migration Strategy

1. Convert existing hardcoded categories to database records with `is_system=TRUE`
2. Update Expense model to use category_id/subcategory_id foreign keys
3. Add migration script to populate system categories

## API Endpoints

### Categories

-   `GET /categories` - List all (system + user's custom)
-   `POST /categories` - Create custom category
-   `PUT /categories/:id` - Update custom category
-   `DELETE /categories/:id` - Soft delete (requires reassignment)

### Subcategories

-   `GET /subcategories?category_id=X` - List by category
-   `POST /subcategories` - Create subcategory
-   `PUT /subcategories/:id` - Update subcategory
-   `DELETE /subcategories/:id` - Soft delete

## Implementation Phases

### Phase 1: Backend Foundation

-   Create Category and Subcategory models
-   Migration script for system categories
-   CRUD API endpoints
-   Validation logic (prevent deleting used categories)

### Phase 2: Frontend UI

-   Settings page for category management
-   Create/Edit/Delete modals
-   Icon & color pickers
-   Expense form integration

### Phase 3: Polish

-   Drag-and-drop category reordering
-   Bulk expense reassignment tool
-   Category usage analytics
-   Import/export category templates

## Dependencies

-   Should be implemented before or alongside Goals feature (#4)
-   Affects existing expense categorization logic

## Success Metrics

-   Users can create and manage custom categories
-   No breaking changes to existing expense data
-   Smooth migration from hardcoded to database categories
-   Category reassignment flow prevents data loss
