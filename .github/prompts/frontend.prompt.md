# Frontend Development Context

This prompt is auto-attached when working on frontend files.

## File Patterns

-   `frontend/**/*.jsx`
-   `frontend/**/*.js`
-   `frontend/**/*.css`

## Quick Reference

### Money: Convert for Display

```javascript
formatCurrency(1500); // "€15.00"
const cents = Math.round(parseFloat(input) * 100); // For API
```

### Dark Mode Pattern

```jsx
<div className="bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text">
```

### API Usage

```javascript
const response = await myAPI.getAll();
setItems(response.data);
```

### Color Tokens

-   Primary: `bloom-pink` / `dark-pink`
-   Background: `bloom-light` / `dark-base`
-   Surface: `white` / `dark-surface`

### Test Command

```powershell
btest f
```

**Full details:** Read `.github/FRONTEND_INSTRUCTIONS.md`
