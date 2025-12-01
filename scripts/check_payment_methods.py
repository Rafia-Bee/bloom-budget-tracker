"""
Check unique payment_method values in database
"""

from backend.models.database import db, Expense
from backend.app import create_app
import sys
import os
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")))


def check_payment_methods():
    app = create_app()

    with app.app_context():
        methods = db.session.query(Expense.payment_method).distinct().all()

        print("Unique payment_method values in database:")
        for method in methods:
            if method[0]:
                count = Expense.query.filter_by(
                    payment_method=method[0]).count()
                print(f'  - "{method[0]}" ({count} expenses)')

        # Show some examples
        print("\nSample expenses with each payment method:")
        for method in methods:
            if method[0]:
                example = Expense.query.filter_by(
                    payment_method=method[0]).first()
                if example:
                    print(f'\n  {method[0]}:')
                    print(f'    Name: {example.name}')
                    print(f'    Amount: €{example.amount/100:.2f}')
                    print(f'    Date: {example.date}')


if __name__ == "__main__":
    check_payment_methods()
