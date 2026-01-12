# Backend Development Context

This prompt is auto-attached when working on backend files.

## File Patterns

-   `backend/**/*.py`
-   `*.py` in root (except scripts/)

## Quick Reference

### Money: Integer Cents

```python
amount = 1500  # €15.00, never floats
```

### Always Filter by User

```python
items = Model.query.filter_by(user_id=user_id, is_deleted=False).all()
```

### Route Pattern

```python
@bp.route('', methods=['POST'])
@jwt_required()
def create():
    user_id = get_jwt_identity()
    data = request.get_json()
    # Validate, create, commit, return
```

### Test Command

```powershell
btest b
```

**Full details:** Read `.github/BACKEND_INSTRUCTIONS.md`
