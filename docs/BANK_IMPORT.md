# Bank Transaction Import

Import transactions directly from your bank statement into Bloom with automatic categorization.

## Features

👀 **Preview Before Import**
- Review all transactions before importing
- See how transactions will be categorized
- Check for duplicates and errors
- Edit data before confirming

✨ **Smart Categorization**
- Automatically categorizes transactions based on merchant name
- Uses existing expense name mappings for accuracy
- Pattern-based classification for common merchants:
  - Uber/Bolt/Taxi → Transportation
  - Wolt/Foodora/Uber Eats → Food
  - Netflix/Spotify/Disney → Subscriptions
  - PayPal/Wise/Revolut → Shopping (default)

🔍 **Intelligent Processing**
- Skips duplicate transactions (same date, amount, and merchant)
- Only imports expenses (negative amounts)
- Assigns to correct budget period based on transaction date
- Supports comma decimal separator (42,33 → 42.33)
- Handles both tab-separated and multi-space separated data

## How to Use

### Step 1: Access Import Feature

1. Open the Dashboard
2. Click your profile icon (top right)
3. Select "Import Bank Transactions"

### Step 2: Prepare Your Data

Copy transaction data from your bank statement. Expected format:

```
Transaction Date	Amount	Name
2025/11/22	-42,33	Wise Europe SA
2025/11/24	-38,88	Wise
2025/11/24	-0,18	UBER   *TRIP
```

**Format Requirements:**
- Headers: `Transaction Date`, `Amount`, `Name`
- Date format: `YYYY/MM/DD` or `YYYY-MM-DD`
- Amount: Negative numbers for expenses, comma or period as decimal separator
- Separator: Tab or multiple spaces between columns

### Step 3: Preview & Import

1. Paste the transaction data in the text area
2. Select payment method (Debit card or Credit card)
3. Click "Preview Transactions" to see parsed data
4. Review the preview table:
   - Check merchant names are correct
   - Verify categories assigned
   - Review amounts and dates
5. Click "Confirm & Import" or "Back to Edit" to make changes
6. Page will automatically reload with new transactions

## Supported Bank Formats

The import feature supports data copied from:
- **Nordea**: Copy directly from transaction history
- **Revolut**: Export to CSV, then copy
- **Wise**: Transaction history export
- **Any bank**: As long as data has Transaction Date, Amount, and Name columns

## Example Data

```
Transaction Date	Amount	Name
2025/11/22	-42,33	Wise Europe SA
2025/11/24	-38,88	Wise
2025/11/24	-0,18	UBER   *TRIP
2025/11/24	-50,00	Nordea Responsible Global
2025/11/24	-0,37	UBER   *TRIP
2025/11/24	-3,66	UBR* PENDING.UBER.COM
2025/11/27	303,50	PAYPAL
2025/11/28	-10,99	PAYPAL *DISNEYPLUS
```

**What gets imported from above:**
- All negative amounts (expenses): 8 transactions
- Skipped: `303,50 PAYPAL` (income/positive amount)

## Automatic Categorization Examples

| Merchant Name | Category | Subcategory |
|--------------|----------|-------------|
| UBER *TRIP | Flexible Expenses | Transportation |
| Wolt | Flexible Expenses | Food |
| PAYPAL *DISNEYPLUS | Fixed Expenses | Subscriptions |
| Wise Europe SA | Flexible Expenses | Shopping |

## Troubleshooting

**"Invalid format" error**
- Ensure you copied the header row
- Check that columns are separated by tabs or multiple spaces
- Verify date format is YYYY/MM/DD or YYYY-MM-DD

**Transactions not appearing**
- Check if they were marked as duplicates (same date, amount, merchant)
- Verify amounts are negative (only expenses are imported)
- Ensure the date falls within an existing budget period

**Wrong category assigned**
- You can manually edit transactions after import
- Add merchant to expense name mappings for future accuracy

## Technical Details

**Endpoint:** `POST /data/import-bank-transactions`

**Request Body:**
```json
{
  "transactions": "Transaction Date\tAmount\tName\n2025/11/22\t-42,33\tWise",
  "payment_method": "Debit card"
}
```

**Response:**
```json
{
  "message": "Successfully imported 5 transaction(s), skipped 2",
  "imported_count": 5,
  "skipped_count": 2,
  "created_expenses": [
    {
      "name": "Wise Europe SA",
      "amount": 42.33,
      "date": "2025-11-22",
      "category": "Flexible Expenses",
      "subcategory": "Shopping"
    }
  ],
  "errors": [
    "Line 3: Skipped income transaction (amount: 303.50)"
  ]
}
```

## Future Enhancements

- [ ] CSV file upload support
- [ ] Custom column mapping
- [ ] More merchant patterns
- [ ] Category override before import
- [ ] Import history tracking
