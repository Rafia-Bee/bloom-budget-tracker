"""
Bloom - Goals API Routes

REST endpoints for managing savings goals and financial targets.
Goals are linked to subcategories in the 'Savings & Investments' category.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
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
        Goal.active()
        .filter_by(user_id=current_user_id, is_active=True)
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

    # Parse initial amount (pre-existing savings) if provided
    initial_amount = 0
    if data.get("initial_amount"):
        initial_amount = int(data["initial_amount"])  # Already in cents from frontend
        if initial_amount < 0:
            return jsonify({"error": "Initial amount cannot be negative"}), 400
        if initial_amount > target_amount:
            return (
                jsonify({"error": "Initial amount cannot exceed target amount"}),
                400,
            )

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
            initial_amount=initial_amount,
            target_date=target_date,
            subcategory_name=subcategory_name,
            is_active=True,
        )
        db.session.add(goal)
        db.session.commit()

        goal_dict = goal.to_dict()
        goal_dict["progress"] = goal.calculate_progress()

        return jsonify({"message": "Goal created successfully", "goal": goal_dict}), 201

    except IntegrityError:
        db.session.rollback()
        return (
            jsonify(
                {
                    "error": f"Subcategory '{subcategory_name}' already exists. Try again."
                }
            ),
            409,
        )
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[create_goal] Database error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to create goal. Please try again."}), 500
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@goals_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_goal(id):
    """Update an existing goal."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    # Single query with user_id to prevent enumeration attacks
    goal = Goal.active().filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

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

        # Update initial amount (pre-existing savings)
        if "initial_amount" in data:
            initial_amount = int(
                data["initial_amount"]
            )  # Already in cents from frontend
            if initial_amount < 0:
                return jsonify({"error": "Initial amount cannot be negative"}), 400
            # Check against the potentially updated target amount
            effective_target = goal.target_amount
            if initial_amount > effective_target:
                return (
                    jsonify({"error": "Initial amount cannot exceed target amount"}),
                    400,
                )
            goal.initial_amount = initial_amount

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

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_goal] Database error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to update goal. Please try again."}), 500
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@goals_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_goal(id):
    """
    Delete a goal and handle associated subcategory.
    Offers soft delete (deactivate) or hard delete options.
    """
    current_user_id = int(get_jwt_identity())
    force = request.args.get("force", "false").lower() == "true"

    # Single query with user_id to prevent enumeration attacks
    goal = Goal.active().filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

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

        # Soft delete the goal
        goal.soft_delete()
        db.session.commit()

        message = "Goal deleted successfully"
        if force and contribution_count > 0:
            message = f"Goal deleted. {contribution_count} contribution(s) moved to 'Other' subcategory"

        return (
            jsonify({"message": message, "contribution_count": contribution_count}),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[delete_goal] Database error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to delete goal. Please try again."}), 500


@goals_bp.route("/<int:id>/restore", methods=["POST"])
@jwt_required()
def restore_goal(id):
    """Restore a soft-deleted goal, recreate its subcategory, and reassign contributions."""
    current_user_id = int(get_jwt_identity())
    goal = Goal.deleted().filter_by(id=id, user_id=current_user_id).first()

    if not goal:
        return jsonify({"error": "Deleted goal not found"}), 404

    try:
        # Restore the goal
        goal.restore()

        # Recreate the subcategory if it doesn't exist
        existing_subcategory = Subcategory.query.filter_by(
            user_id=current_user_id,
            category="Savings & Investments",
            name=goal.subcategory_name,
        ).first()

        subcategory_recreated = False
        if not existing_subcategory:
            new_subcategory = Subcategory(
                user_id=current_user_id,
                category="Savings & Investments",
                name=goal.subcategory_name,
                is_active=True,
                is_system=False,
            )
            db.session.add(new_subcategory)
            subcategory_recreated = True

        # Find and reassign expenses that were moved to "Other" when this goal was deleted
        # These have a note like: "[Auto-updated] Moved from deleted goal 'GoalName'"
        marker = f"[Auto-updated] Moved from deleted goal '{goal.name}'"
        moved_expenses = Expense.query.filter(
            Expense.user_id == current_user_id,
            Expense.category == "Savings & Investments",
            Expense.subcategory == "Other",
            Expense.notes.contains(marker),
        ).all()

        contributions_restored = 0
        for expense in moved_expenses:
            expense.subcategory = goal.subcategory_name
            # Remove the auto-added note
            if expense.notes:
                expense.notes = expense.notes.replace(f"\n{marker}", "").replace(
                    marker, ""
                )
                if not expense.notes.strip():
                    expense.notes = None
            contributions_restored += 1

        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Goal restored successfully",
                    "subcategory_recreated": subcategory_recreated,
                    "contributions_restored": contributions_restored,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[restore_goal] Database error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to restore goal. Please try again."}), 500


@goals_bp.route("/deleted", methods=["GET"])
@jwt_required()
def get_deleted_goals():
    """Get all soft-deleted goals for the current user."""
    current_user_id = int(get_jwt_identity())
    deleted_goals = Goal.deleted().filter_by(user_id=current_user_id).all()

    return (
        jsonify(
            [
                {
                    "id": g.id,
                    "name": g.name,
                    "target_amount": g.target_amount,
                    "subcategory_name": g.subcategory_name,
                    "deleted_at": g.deleted_at.isoformat() if g.deleted_at else None,
                }
                for g in deleted_goals
            ]
        ),
        200,
    )


@goals_bp.route("/<int:id>/progress", methods=["GET"])
@jwt_required()
def get_goal_progress(id):
    """Get detailed progress information for a specific goal."""
    current_user_id = int(get_jwt_identity())

    # Single query with user_id to prevent enumeration attacks
    goal = Goal.active().filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

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


@goals_bp.route("/<int:id>/transactions", methods=["GET"])
@jwt_required()
def get_goal_transactions(id):
    """
    Get paginated transaction history for a specific goal.
    Returns all expenses in the goal's linked subcategory.
    """
    current_user_id = int(get_jwt_identity())

    # Single query with user_id to prevent enumeration attacks
    goal = Goal.active().filter_by(id=id, user_id=current_user_id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404

    # Pagination parameters
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)  # Cap at 100 per page

    # Get all contributions for this goal with pagination
    transactions_query = Expense.query.filter_by(
        user_id=current_user_id,
        category="Savings & Investments",
        subcategory=goal.subcategory_name,
    ).order_by(Expense.date.desc())

    total_count = transactions_query.count()
    transactions = (
        transactions_query.offset((page - 1) * per_page).limit(per_page).all()
    )

    # Calculate running balance for each transaction
    # Get all transactions up to current page for running balance
    all_prior_transactions = (
        Expense.query.filter_by(
            user_id=current_user_id,
            category="Savings & Investments",
            subcategory=goal.subcategory_name,
        )
        .order_by(Expense.date.asc())
        .all()
    )

    # Build running balance map
    running_balance = goal.initial_amount
    balance_map = {}
    for t in all_prior_transactions:
        running_balance += t.amount
        balance_map[t.id] = running_balance

    transaction_list = []
    for expense in transactions:
        transaction_list.append(
            {
                "id": expense.id,
                "amount": expense.amount,
                "date": expense.date.isoformat(),
                "name": expense.name,
                "notes": expense.notes,
                "payment_method": expense.payment_method,
                "running_balance": balance_map.get(expense.id, 0),
            }
        )

    # Calculate totals
    total_contributions = sum(t.amount for t in all_prior_transactions)

    return (
        jsonify(
            {
                "transactions": transaction_list,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total_count": total_count,
                    "total_pages": (total_count + per_page - 1) // per_page,
                },
                "summary": {
                    "initial_amount": goal.initial_amount,
                    "total_contributions": total_contributions,
                    "current_amount": goal.initial_amount + total_contributions,
                    "target_amount": goal.target_amount,
                },
            }
        ),
        200,
    )
