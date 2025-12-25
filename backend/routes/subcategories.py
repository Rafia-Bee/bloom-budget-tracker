"""
Bloom - Subcategory Routes

This module handles subcategory management endpoints.

Endpoints:
- GET /subcategories: Get all subcategories (system + user's custom)
- POST /subcategories: Create new custom subcategory
- PUT /subcategories/<id>: Update custom subcategory
- DELETE /subcategories/<id>: Delete custom subcategory (soft delete)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from backend.models.database import db, Subcategory, Expense
from backend.utils.validators import ALLOWED_CATEGORIES

subcategories_bp = Blueprint("subcategories", __name__, url_prefix="/subcategories")


@subcategories_bp.route("", methods=["GET"])
@jwt_required()
def get_subcategories():
    """
    Get all subcategories (system + user's custom).

    Query params:
    - category: Filter by category (optional)
    - active_only: Only return active subcategories (default: true)
    """
    current_user_id = int(get_jwt_identity())

    category = request.args.get("category")
    active_only = request.args.get("active_only", "true").lower() == "true"

    # Query: System subcategories (user_id IS NULL) OR user's custom subcategories
    query = Subcategory.query.filter(
        (Subcategory.user_id == None) | (Subcategory.user_id == current_user_id)
    )

    if category:
        if category not in ALLOWED_CATEGORIES:
            return jsonify({"error": f"Invalid category: {category}"}), 400
        query = query.filter_by(category=category)

    if active_only:
        query = query.filter_by(is_active=True)

    subcategories = query.order_by(Subcategory.category, Subcategory.name).all()

    # Group by category
    grouped = {}
    for subcat in subcategories:
        if subcat.category not in grouped:
            grouped[subcat.category] = []
        grouped[subcat.category].append(subcat.to_dict())

    return jsonify({"subcategories": grouped, "total": len(subcategories)}), 200


@subcategories_bp.route("", methods=["POST"])
@jwt_required()
def create_subcategory():
    """Create a new custom subcategory."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not data.get("category") or not data.get("name"):
        return jsonify({"error": "Category and name are required"}), 400

    category = data["category"]
    name = data["name"].strip()

    # Validate category
    if category not in ALLOWED_CATEGORIES:
        return (
            jsonify(
                {
                    "error": f"Invalid category. Must be one of: {', '.join(ALLOWED_CATEGORIES)}"
                }
            ),
            400,
        )

    # Check for duplicate (same name in same category for this user)
    existing = Subcategory.query.filter(
        (Subcategory.user_id == current_user_id) | (Subcategory.user_id == None),
        Subcategory.category == category,
        db.func.lower(Subcategory.name) == name.lower(),
    ).first()

    if existing:
        return (
            jsonify({"error": f"Subcategory '{name}' already exists in {category}"}),
            409,
        )

    # Create new subcategory
    subcategory = Subcategory(
        user_id=current_user_id,
        category=category,
        name=name,
        is_system=False,
        is_active=True,
    )

    try:
        db.session.add(subcategory)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return (
            jsonify({"error": f"Subcategory '{name}' already exists in {category}"}),
            409,
        )

    return (
        jsonify(
            {
                "message": "Subcategory created successfully",
                "subcategory": subcategory.to_dict(),
            }
        ),
        201,
    )


@subcategories_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_subcategory(id):
    """Update a custom subcategory (system subcategories cannot be edited)."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    # Single query with user_id to prevent enumeration attacks
    # Only user-owned subcategories can be edited (not system ones)
    subcategory = Subcategory.query.filter_by(id=id, user_id=current_user_id).first()

    if not subcategory:
        return jsonify({"error": "Subcategory not found"}), 404

    # Update name if provided
    if "name" in data:
        old_name = subcategory.name
        new_name = data["name"].strip()

        # Check for duplicate
        existing = Subcategory.query.filter(
            Subcategory.id != id,
            (Subcategory.user_id == current_user_id) | (Subcategory.user_id == None),
            Subcategory.category == subcategory.category,
            db.func.lower(Subcategory.name) == new_name.lower(),
        ).first()

        if existing:
            return (
                jsonify(
                    {
                        "error": f"Subcategory '{new_name}' already exists in {subcategory.category}"
                    }
                ),
                409,
            )

        # Update all existing expenses to use the new subcategory name
        if old_name != new_name:
            expenses_to_update = Expense.query.filter_by(
                user_id=current_user_id, subcategory=old_name
            ).all()

            for expense in expenses_to_update:
                expense.subcategory = new_name

        subcategory.name = new_name

    # Update active status if provided
    if "is_active" in data:
        subcategory.is_active = bool(data["is_active"])

    db.session.commit()

    return (
        jsonify(
            {
                "message": "Subcategory updated successfully",
                "subcategory": subcategory.to_dict(),
            }
        ),
        200,
    )


@subcategories_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_subcategory(id):
    """
    Delete a custom subcategory (soft delete).
    Returns error if subcategory is in use unless force=true.
    """
    current_user_id = int(get_jwt_identity())
    force = request.args.get("force", "false").lower() == "true"

    # Single query with user_id to prevent enumeration attacks
    # Only user-owned subcategories can be deleted (not system ones)
    subcategory = Subcategory.query.filter_by(id=id, user_id=current_user_id).first()

    if not subcategory:
        return jsonify({"error": "Subcategory not found"}), 404

    # Check if subcategory is in use
    expense_count = Expense.query.filter_by(
        user_id=current_user_id, subcategory=subcategory.name
    ).count()

    if expense_count > 0 and not force:
        return (
            jsonify(
                {
                    "error": f"Cannot delete subcategory - it's used by {expense_count} expense(s)",
                    "expense_count": expense_count,
                    "can_force": True,
                }
            ),
            409,
        )

    if force:
        # Force delete - move expenses to "Other" subcategory instead of deleting
        if expense_count > 0:
            # Use the system "Other" subcategory for this category
            other_subcategory = Subcategory.query.filter_by(
                name="Other", category=subcategory.category, is_system=True
            ).first()

            if not other_subcategory:
                # This shouldn't happen with system defaults, but create as fallback
                other_subcategory = Subcategory(
                    name="Other",
                    category=subcategory.category,
                    user_id=None,  # System subcategory
                    is_system=True,
                    is_active=True,
                )
                db.session.add(other_subcategory)
                db.session.flush()  # Get ID before continuing

            # Move all expenses to "Other" subcategory and add explanatory note
            expenses_to_update = Expense.query.filter_by(
                user_id=current_user_id, subcategory=subcategory.name
            ).all()

            for expense in expenses_to_update:
                # Add note about the subcategory change
                note_text = f"[Auto-updated] Moved from deleted subcategory '{subcategory.name}'"
                if expense.notes:
                    expense.notes = f"{expense.notes}\n{note_text}"
                else:
                    expense.notes = note_text
                expense.subcategory = "Other"

        # Delete the subcategory itself
        db.session.delete(subcategory)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": f"Subcategory deleted. {expense_count} expense(s) moved to 'Other' subcategory",
                    "expense_count": expense_count,
                }
            ),
            200,
        )
    else:
        # Soft delete (mark as inactive)
        subcategory.is_active = False
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Subcategory deleted successfully",
                    "expense_count": expense_count,
                }
            ),
            200,
        )
