# Recurring Expenses Auto-Generation

This document explains how recurring expenses are automatically generated in Bloom.

## How It Works

1. **Templates**: Users create recurring expense templates with:
   - Frequency (weekly, biweekly, monthly, custom)
   - Scheduling details (day of week, day of month, custom interval)
   - Start/end dates
   - All standard expense fields

2. **Generation Logic**: The system checks for templates where `next_due_date <= today` and creates actual expenses from them.

3. **Auto-Update**: After generating an expense, the template's `next_due_date` is automatically updated based on the frequency.

## Manual Generation

Users can manually trigger generation via the "⚡ Generate Now" button on the Recurring Expenses page.

## Automatic Scheduling

### Option 1: Manual Daily Run (Development)

Run the generation script manually:
```bash
python -m backend.run_recurring_generation
```

### Option 2: Windows Task Scheduler (Production - Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Bloom Recurring Expenses Generator"
4. Trigger: Daily at 12:00 AM
5. Action: Start a program
   - Program: `C:\Users\saiyu\Desktop\Code\.venv\Scripts\python.exe`
   - Arguments: `-m backend.run_recurring_generation`
   - Start in: `C:\Users\saiyu\Desktop\Code\Bloom`

### Option 3: Cron Job (Production - Linux/Mac)

Add to crontab:
```bash
# Run daily at midnight
0 0 * * * cd /path/to/Bloom && /path/to/python -m backend.run_recurring_generation
```

### Option 4: API Endpoint (On-Demand)

The system also exposes API endpoints for manual triggering:

**Generate for current user:**
```bash
POST /recurring-generation/generate
Authorization: Bearer <token>
```

**Preview upcoming (no generation):**
```bash
GET /recurring-generation/preview?days=30
Authorization: Bearer <token>
```

**Dry run (see what would be generated):**
```bash
POST /recurring-generation/generate?dry_run=true
Authorization: Bearer <token>
```

## Features

- ✅ Automatic expense generation from templates
- ✅ Smart date calculation (handles month boundaries, leap years)
- ✅ Duplicate prevention (won't generate twice for same date)
- ✅ Auto-deactivation when end_date is reached
- ✅ Manual "Generate Now" button
- ✅ Active/Paused status for templates
- ✅ Preview upcoming expenses

## Testing

1. Create a recurring expense template with today as start date
2. Click "⚡ Generate Now"
3. Navigate to Dashboard to see the generated expense
4. Check that the template's next due date has been updated
