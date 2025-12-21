"""
Check expenses for current salary period
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import create_app, db
from backend.models.database import Expense, SalaryPeriod
from datetime import datetime

app = create_app()
app.app_context().push()

# Get active salary period
salary_period = SalaryPeriod.query.filter_by(is_active=True).first()

if not salary_period:
    print("No active salary period found")
    exit()

print(f"\n=== SALARY PERIOD: {salary_period.start_date} to {salary_period.end_date} ===\n")

# Get all expenses in this period
expenses = Expense.query.filter(
    Expense.date >= salary_period.start_date,
    Expense.date <= salary_period.end_date
).order_by(Expense.date).all()

print(f"Total expenses: {len(expenses)}\n")

debit_total = 0
credit_total = 0

for expense in expenses:
    payment = "DEBIT" if expense.payment_method == "Debit card" else "CREDIT"
    fixed = " [FIXED]" if expense.is_fixed_bill else ""
    print(f"{expense.date} | {payment:6} | €{expense.amount/100:>8.2f} | {expense.name}{fixed}")

    if expense.payment_method == "Debit card" and not expense.is_fixed_bill:
        debit_total += expense.amount
    elif expense.payment_method == "Credit card" and not expense.is_fixed_bill:
        credit_total += expense.amount

print(f"\n=== TOTALS (excluding fixed bills) ===")
print(f"Debit:  €{debit_total/100:.2f}")
print(f"Credit: €{credit_total/100:.2f}")
print(f"Total:  €{(debit_total + credit_total)/100:.2f}")
