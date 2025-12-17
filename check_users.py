from backend.app import create_app
from backend.models.database import db, User

app = create_app('development')

with app.app_context():
    users = User.query.all()
    print(f'Total users: {len(users)}')
    for user in users:
        print(f'  - {user.email} (ID: {user.id})')
