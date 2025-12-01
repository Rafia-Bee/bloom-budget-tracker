# Missing "Pay" button on Debts page

## Description

According to the feature documentation, there should be two ways to make a debt payment:
1. "Debt Payment" button on Dashboard ✅ (exists)
2. "Pay" button on Debts page ❌ (missing)

Currently, users can only make debt payments from the Dashboard's floating action button menu. The Debts page displays debt information but lacks a quick way to record payments directly from that page.

## Expected Behavior

The Debts page should have a "Pay" or "Make Payment" button for each debt entry that:
- Opens the debt payment modal
- Pre-fills the debt name/type
- Allows user to enter payment amount
- Records the payment as an expense with appropriate categorization

## Current Workaround

Users must:
1. Navigate back to Dashboard
2. Click the "+" floating button
3. Select "Debt Payment"
4. Manually select the debt from the dropdown

## Suggested Implementation

Add a "Pay" button to each debt card/row on the Debts page that:
- Opens `AddDebtPaymentModal`
- Pre-selects the specific debt being paid
- Follows the same payment flow as Dashboard

## Priority

Medium - Feature works but UX could be more streamlined

## Labels

- bug
- frontend
- priority: medium
- size: small
