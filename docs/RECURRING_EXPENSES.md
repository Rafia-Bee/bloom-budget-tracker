# Recurring Expenses - On-Demand Generation

This document explains how recurring expenses work in Bloom.

## How It Works

1. **Templates**: Users create recurring expense templates with:

    - Frequency (weekly, biweekly, monthly, custom)
    - Scheduling details (day of week, day of month, custom interval)
    - Start/end dates
    - All standard expense fields
    - Fixed bill flag (deducted from budget upfront)

2. **On-Demand Generation**: Users manually trigger expense generation via the **"⚡ Generate Now"** button on the Recurring Expenses page.

3. **Auto-Update**: After generating an expense, the template's `next_due_date` is automatically updated based on the frequency.

## Generation Method

### Manual "Generate Now" Button (Recommended)

Users click the **"⚡ Generate Now"** button on the Recurring Expenses page to:

-   Check all templates where `next_due_date <= today`
-   Create actual expenses from due templates
-   Update `next_due_date` for each generated expense

This approach gives users full control over when expenses are created.

### API Endpoints

The system exposes API endpoints for generation:

**Generate for current user:**

```bash
POST /api/v1/recurring-generation/generate
# Uses HttpOnly cookie authentication
```

**Preview upcoming (no generation):**

```bash
GET /api/v1/recurring-generation/preview?days=30
# Uses HttpOnly cookie authentication
```

**Dry run (see what would be generated):**

```bash
POST /api/v1/recurring-generation/generate?dry_run=true
# Uses HttpOnly cookie authentication
```

## Features

-   ✅ On-demand expense generation from templates
-   ✅ Smart date calculation (handles month boundaries, leap years)
-   ✅ Duplicate prevention (won't generate twice for same date)
-   ✅ Auto-deactivation when end_date is reached
-   ✅ Manual "Generate Now" button
-   ✅ Active/Paused status for templates
-   ✅ Preview upcoming expenses
-   ✅ Fixed bill support (deducted from weekly budget)

## Data Model

### RecurringExpense Template

| Field             | Type    | Description                    |
| ----------------- | ------- | ------------------------------ |
| `id`              | Integer | Primary key                    |
| `user_id`         | Integer | Owner (FK to User)             |
| `name`            | String  | Expense name                   |
| `amount`          | Integer | Amount in cents                |
| `category`        | String  | Expense category               |
| `subcategory`     | String  | Expense subcategory            |
| `payment_method`  | String  | "debit" or "credit"            |
| `frequency`       | String  | weekly/biweekly/monthly/custom |
| `frequency_value` | Integer | Custom interval days           |
| `day_of_month`    | Integer | 1-31 for monthly               |
| `day_of_week`     | Integer | 0-6 for weekly                 |
| `start_date`      | Date    | Template start                 |
| `end_date`        | Date    | Template end (optional)        |
| `next_due_date`   | Date    | Next generation date           |
| `is_active`       | Boolean | Active/paused state            |
| `is_fixed_bill`   | Boolean | Deduct from budget upfront     |

## Testing

1. Create a recurring expense template with today as start date
2. Click "⚡ Generate Now"
3. Navigate to Dashboard to see the generated expense
4. Check that the template's next due date has been updated

## Best Practices

-   **Fixed Bills**: Mark rent, subscriptions, and utilities as fixed bills so they're deducted from your weekly budget automatically
-   **Frequency**: Use weekly for regular expenses, monthly for bills
-   **End Dates**: Set end dates for temporary recurring expenses (e.g., loan payments)
-   **Pausing**: Use the active/pause toggle to temporarily stop generation without deleting the template
