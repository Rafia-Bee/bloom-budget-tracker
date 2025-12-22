"""
Bloom - Goals API Routes

REST endpoints for managing savings goals and financial targets.
Goals are linked to subcategories in the 'Savings & Investments' category.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Goal, Subcategory, Expense
from datetime import datetime, date
from backend.utils.validators import ALLOWED_CATEGORIES

goals_bp = Blueprint("goals", __name__)


@goals_bp.route("", methods=["GET"])
@jwt_required()
def get_goals():
    """Get all active goals for the current user with progress data."""
    current_user_id = int(get_jwt_identity())

    goals = (
        Goal.query.filter_by(user_id=current_user_id, is_active=True)
        .order_by(Goal.created_at.desc())
        .all()
    )

    goals_with_progress = []
    for goal in goals:
        goal_dict = goal.to_dict()
        goal_dict["progress"] = goal.calculate_progress()
        goals_with_progress.append(goal_dict)

    return (
        jsonify({"goals": goals_with_progress, "count": len(goals_with_progress)}),
        200,
    )


@goals_bp.route("", methods=["POST"])
@jwt_required()
def create_goal():
    """Create a new savings goal and associated subcategory."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    # Validate required fields
    required_fields = ["name", "target_amount"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    name = data["name"].strip()
    target_amount = int(data["target_amount"])  # Already in cents from frontend

    if target_amount <= 0:
        return jsonify({"error": "Target amount must be greater than 0"}), 400

    # Parse target date if provided
    target_date = None
    if data.get("target_date"):
        try:
            target_date = datetime.strptime(data["target_date"], "%Y-%m-%d").date()
            if target_date <= date.today():
                return jsonify({"error": "Target date must be in the future"}), 400
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    # Generate unique subcategory name
    base_subcategory_name = name
    subcategory_name = base_subcategory_name
    counter = 1

    # Check for existing subcategory with same name
    while Subcategory.query.filter(
        (Subcategory.user_id == current_user_id) | (Subcategory.user_id == None),
        Subcategory.category == "Savings & Investments",
        db.func.lower(Subcategory.name) == subcategory_name.lower(),
        Subcategory.is_active == True,
    ).first():
        counter += 1
        subcategory_name = f"{base_subcategory_name} ({counter})"

    try:
        # Create the subcategory first
        subcategory = Subcategory(
            user_id=current_user_id,
            category="Savings & Investments",
            name=subcategory_name,
            is_system=False,
            is_active=True,
        )
        db.session.add(subcategory)
        db.session.flush()  # Get subcategory ID

        # Create the goal
        goal = Goal(
            user_id=current_user_id,
            name=name,
            description=data.get("description", ""),
            target_amount=target_amount,
            target_date=target_date,
            subcategory_name=subcategory_name,
            is_active=True,
        )
        db.session.add(goal)
        db.session.commit()

        goal_dict = goal.to_dict()
        goal_dict["progress"] = goal.calculate_progress()

        return jsonify({"message": "Goal created successfully", "goal": goal_dict}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create goal: {str(e)}"}), 500


@goals_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_goal(id):
    """Update an existing goal."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    goal = Goal.query.get(id)
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    if goal.user_id != current_user_id:
        return jsonify({"error": "You don't have permission to edit this goal"}), 403

    try:
        # Update name and subcategory if changed
        if "name" in data and data["name"].strip() != goal.name:
            new_name = data["name"].strip()
            old_subcategory_name = goal.subcategory_name
            new_subcategory_name = new_name

            # Check if new subcategory name conflicts
            counter = 1
            base_name = new_subcategory_name
            while (
                new_subcategory_name != old_subcategory_name
                and Subcategory.query.filter(
                    (Subcategory.user_id == current_user_id)
                    | (Subcategory.user_id == None),
                    Subcategory.category == "Savings & Investments",
                    db.func.lower(Subcategory.name) == new_subcategory_name.lower(),
                    Subcategory.is_active == True,
                ).first()
            ):
                counter += 1
                new_subcategory_name = f"{base_name} ({counter})"

            # Update subcategory name
            subcategory = Subcategory.query.filter_by(
                user_id=current_user_id,
                category="Savings & Investments",
                name=old_subcategory_name,
            ).first()

            if subcategory:
                subcategory.name = new_subcategory_name

                # Update all expenses using old subcategory name
                expenses = Expense.query.filter_by(
                    user_id=current_user_id,
                    category="Savings & Investments",
                    subcategory=old_subcategory_name,
                ).all()

                for expense in expenses:
                    expense.subcategory = new_subcategory_name

            goal.name = new_name
            goal.subcategory_name = new_subcategory_name

        # Update target amount
        if "target_amount" in data:
            target_amount = int(data["target_amount"])  # Already in cents from frontend
            if target_amount <= 0:
                return jsonify({"error": "Target amount must be greater than 0"}), 400
            goal.target_amount = target_amount

        # Update target date
        if "target_date" in data:
            if data["target_date"]:
                try:
                    target_date = datetime.strptime(
                        data["target_date"], "%Y-%m-%d"
                    ).date()
                    if target_date <= date.today():
                        return (
                            jsonify({"error": "Target date must be in the future"}),
                            400,
                        )
                    goal.target_date = target_date
                except ValueError:
                    return (
                        jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}),
                        400,
                    )
            else:
                goal.target_date = None

        # Update description
        if "description" in data:
            goal.description = data["description"]

        goal.updated_at = datetime.utcnow()
        db.session.commit()

        goal_dict = goal.to_dict()
        goal_dict["progress"] = goal.calculate_progress()

        return jsonify({"message": "Goal updated successfully", "goal": goal_dict}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update goal: {str(e)}"}), 500


@goals_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_goal(id):
    """
    Delete a goal and handle associated subcategory.
    Offers soft delete (deactivate) or hard delete options.
    """
    current_user_id = int(get_jwt_identity())
    force = request.args.get("force", "false").lower() == "true"

    goal = Goal.query.get(id)
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    if goal.user_id != current_user_id:
        return jsonify({"error": "You don't have permission to delete this goal"}), 403

    try:
        # Check for contributions (expenses in this goal's subcategory)
        contribution_count = Expense.query.filter_by(
            user_id=current_user_id,
            category="Savings & Investments",
            subcategory=goal.subcategory_name,
        ).count()

        if contribution_count > 0 and not force:
            return (
                jsonify(
                    {
                        "error": f"Cannot delete goal - it has {contribution_count} contribution(s)",
                        "contribution_count": contribution_count,
                        "can_force": True,
                    }
                ),
                409,
            )

        if force and contribution_count > 0:
            # Move contributions to "Other" subcategory
            other_subcategory = Subcategory.query.filter_by(
                name="Other", category="Savings & Investments", is_system=True
            ).first()

            contributions = Expense.query.filter_by(
                user_id=current_user_id,
                category="Savings & Investments",
                subcategory=goal.subcategory_name,
            ).all()

            for expense in contributions:
                note_text = f"[Auto-updated] Moved from deleted goal '{goal.name}'"
                if expense.notes:
                    expense.notes = f"{expense.notes}\n{note_text}"
                else:
                    expense.notes = note_text
                expense.subcategory = "Other"

        # Delete the associated subcategory
        subcategory = Subcategory.query.filter_by(
            user_id=current_user_id,
            category="Savings & Investments",
            name=goal.subcategory_name,
        ).first()

        if subcategory:
            db.session.delete(subcategory)

        # Delete the goal
        db.session.delete(goal)
        db.session.commit()

        message = "Goal deleted successfully"
        if force and contribution_count > 0:
            message = f"Goal deleted. {contribution_count} contribution(s) moved to 'Other' subcategory"

        return (
            jsonify({"message": message, "contribution_count": contribution_count}),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete goal: {str(e)}"}), 500


@goals_bp.route("/<int:id>/progress", methods=["GET"])
@jwt_required()
def get_goal_progress(id):
    """Get detailed progress information for a specific goal."""
    current_user_id = int(get_jwt_identity())

    goal = Goal.query.get(id)
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    if goal.user_id != current_user_id:
        return jsonify({"error": "You don't have permission to view this goal"}), 403

    # Get all contributions for this goal
    contributions = (
        Expense.query.filter_by(
            user_id=current_user_id,
            category="Savings & Investments",
            subcategory=goal.subcategory_name,
        )
        .order_by(Expense.date.desc())
        .all()
    )

    contribution_list = []
    for expense in contributions:
        contribution_list.append(
            {
                "id": expense.id,
                "amount": expense.amount,
                "date": expense.date.isoformat(),
                "name": expense.name,
                "notes": expense.notes,
            }
        )

    progress = goal.calculate_progress()
    progress["contributions"] = contribution_list
    progress["contribution_count"] = len(contribution_list)

    return jsonify({"goal": goal.to_dict(), "progress": progress}), 200
