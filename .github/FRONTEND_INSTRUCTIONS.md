# Frontend Development Instructions

Guidelines for working with the Bloom Budget Tracker React frontend.

---

## 🏗️ Architecture Overview

```
frontend/
├── src/
│   ├── api.js              # Axios instance & API functions
│   ├── App.jsx             # Root component with routing
│   ├── main.jsx            # Entry point
│   ├── index.css           # Global styles (Tailwind)
│   ├── components/         # Reusable UI components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   └── reports/        # Report components
│   ├── contexts/           # React contexts (Theme, Currency)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components (routes)
│   ├── utils/              # Helper functions
│   └── test/               # Test utilities
├── public/                 # Static assets
├── tailwind.config.js      # Tailwind configuration
└── vite.config.js          # Vite configuration
```

### Technology Stack

-   **Framework:** React 18 with Vite
-   **Styling:** Tailwind CSS
-   **State:** React Context + hooks (no Redux)
-   **API:** Axios with HttpOnly cookie auth
-   **Testing:** Vitest + React Testing Library

---

## 💰 Money Handling

**CRITICAL: Backend stores amounts as INTEGER CENTS. Frontend must convert for display.**

```javascript
// Display: cents → formatted currency
import { formatCurrency } from "./utils/currency";
formatCurrency(1500); // "€15.00"

// Input: euros → cents for API
const cents = Math.round(parseFloat(userInput) * 100);

// API always sends/receives cents
api.post("/expenses", { amount: 1500 }); // €15.00
```

### Currency Utilities

```javascript
// utils/currency.js
export const formatCurrency = (cents, currency = "EUR") => {
    const euros = cents / 100;
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency,
    }).format(euros);
};
```

---

## 🎨 Styling with Tailwind

### Color System

Use Bloom design tokens, not raw colors:

```jsx
// ✅ Correct: Use Bloom colors
<div className="bg-bloom-pink text-dark-text">

// ❌ Wrong: Raw colors
<div className="bg-pink-500 text-gray-900">
```

### Light/Dark Mode Colors

| Purpose        | Light Mode    | Dark Mode             |
| -------------- | ------------- | --------------------- |
| Primary        | `bloom-pink`  | `dark-pink`           |
| Background     | `bloom-light` | `dark-base`           |
| Surface/Card   | `white`       | `dark-surface`        |
| Elevated       | `white`       | `dark-elevated`       |
| Text Primary   | `gray-900`    | `dark-text`           |
| Text Secondary | `gray-600`    | `dark-text-secondary` |
| Border         | `gray-200`    | `dark-border`         |
| Success        | `bloom-mint`  | `dark-success`        |
| Warning        | `bloom-peach` | `dark-warning`        |
| Danger         | `red-500`     | `dark-danger`         |

### Dark Mode Pattern

```jsx
<div className="bg-white dark:bg-dark-surface
                text-gray-900 dark:text-dark-text
                border border-gray-200 dark:border-dark-border">
```

---

## 📁 Component Patterns

### Page Component

```jsx
// pages/MyPage.jsx
import { useState, useEffect } from "react";
import { myAPI } from "../api";
import Header from "../components/Header";
import Loading from "../components/Loading";

export default function MyPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await myAPI.getAll();
            setData(response.data);
        } catch (err) {
            setError("Failed to load data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-bloom-light dark:bg-dark-base">
            <Header title="My Page" />
            <main className="container mx-auto p-4">
                {error && (
                    <div
                        className="bg-red-100 dark:bg-dark-danger/20
                                    text-red-700 dark:text-dark-danger
                                    p-4 rounded-lg mb-4"
                    >
                        {error}
                    </div>
                )}
                {/* Content */}
            </main>
        </div>
    );
}
```

### Modal Component

```jsx
// components/MyModal.jsx
import { useState } from "react";

export default function MyModal({ isOpen, onClose, onSubmit }) {
    const [formData, setFormData] = useState({ name: "", amount: "" });
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Convert euros to cents
            const data = {
                ...formData,
                amount: Math.round(parseFloat(formData.amount) * 100),
            };
            await onSubmit(data);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 dark:bg-dark-overlay
                        flex items-center justify-center z-50"
        >
            <div
                className="bg-white dark:bg-dark-surface
                            rounded-2xl p-6 w-full max-w-md mx-4
                            border dark:border-dark-border"
            >
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">
                    Modal Title
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* Form fields */}

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2
                                       bg-gray-100 dark:bg-dark-elevated
                                       rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2
                                       bg-bloom-pink dark:bg-dark-pink
                                       text-white rounded-xl"
                        >
                            {submitting ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

---

## 🔌 API Integration

### API File Structure (api.js)

```javascript
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api/v1",
    withCredentials: true, // Required for cookie auth
});

export const myFeatureAPI = {
    getAll: (params) => api.get("/my-feature", { params }),
    getOne: (id) => api.get(`/my-feature/${id}`),
    create: (data) => api.post("/my-feature", data),
    update: (id, data) => api.put(`/my-feature/${id}`, data),
    delete: (id) => api.delete(`/my-feature/${id}`),
};
```

### Using API in Components

```javascript
import { myFeatureAPI } from "../api";

// In component
const loadItems = async () => {
    const response = await myFeatureAPI.getAll();
    setItems(response.data); // response.data contains the array
};

const createItem = async (data) => {
    const response = await myFeatureAPI.create(data);
    // response.data is the created item
    setItems([...items, response.data]);
};
```

---

## 🪝 Custom Hooks

### Pattern

```javascript
// hooks/useMyFeature.js
import { useState, useEffect } from "react";
import { myFeatureAPI } from "../api";

export function useMyFeature() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            setLoading(true);
            const response = await myFeatureAPI.getAll();
            setItems(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createItem = async (data) => {
        const response = await myFeatureAPI.create(data);
        setItems([...items, response.data]);
        return response.data;
    };

    return { items, loading, error, createItem, refresh: loadItems };
}
```

---

## 🌐 Context Usage

### Theme Context

```jsx
import { useTheme } from "../contexts/ThemeContext";

function MyComponent() {
    const { darkMode, toggleDarkMode } = useTheme();

    return <button onClick={toggleDarkMode}>{darkMode ? "☀️" : "🌙"}</button>;
}
```

### Currency Context

```jsx
import { useCurrency } from "../contexts/CurrencyContext";

function MyComponent() {
    const { currency, formatAmount } = useCurrency();

    return <span>{formatAmount(1500)}</span>; // "€15.00"
}
```

---

## ✅ Testing

### Running Tests

```powershell
# Quick command
btest f

# Or manually:
cd frontend
npm test
npm run test:coverage
```

### Test Structure

```javascript
// src/test/MyComponent.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyComponent from "../components/MyComponent";

// Mock API
vi.mock("../api", () => ({
    myFeatureAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
    },
}));

describe("MyComponent", () => {
    it("renders correctly", () => {
        render(<MyComponent />);
        expect(screen.getByText("Title")).toBeInTheDocument();
    });

    it("handles user interaction", async () => {
        const user = userEvent.setup();
        render(<MyComponent />);

        await user.click(screen.getByRole("button"));

        await waitFor(() => {
            expect(screen.getByText("Clicked")).toBeInTheDocument();
        });
    });
});
```

---

## 🚨 Common Pitfalls

### 1. Forgetting cents conversion

```jsx
// ❌ Wrong: Sending euros to API
api.post("/expenses", { amount: 15.0 });

// ✅ Correct: Convert to cents
api.post("/expenses", { amount: 1500 });
```

### 2. Missing dark mode classes

```jsx
// ❌ Wrong: No dark mode support
<div className="bg-white text-gray-900">

// ✅ Correct: Include dark variants
<div className="bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text">
```

### 3. Not handling loading states

```jsx
// ❌ Wrong: No loading indicator
const [data, setData] = useState([]);

// ✅ Correct: Track loading
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

if (loading) return <Loading />;
```

### 4. Direct state mutation

```jsx
// ❌ Wrong: Mutating state directly
items.push(newItem);
setItems(items);

// ✅ Correct: Create new array
setItems([...items, newItem]);
```

---

## 📱 Responsive Design

### Breakpoints

```jsx
// Mobile first, then larger screens
<div className="p-4 md:p-6 lg:p-8">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<div className="text-sm md:text-base lg:text-lg">
```

### Mobile-Friendly Touch Targets

```jsx
// Minimum 44px touch targets
<button className="p-3 min-h-[44px] min-w-[44px]">
```

---

## 📂 File Size Limits

Keep components under **300 lines**. If larger:

1. Extract sub-components
2. Move logic to custom hooks
3. Split into smaller focused components

---

## 📚 Related Documentation

-   [tailwind.config.js](../frontend/tailwind.config.js) - Color definitions
-   [TEST_COVERAGE.md](../frontend/TEST_COVERAGE.md) - Test coverage details
-   [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
-   [API.md](../docs/API.md) - API endpoint reference
