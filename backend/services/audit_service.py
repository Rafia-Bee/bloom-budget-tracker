"""
Audit Logging Service

Lightweight audit logging for tracking key data changes.
Logs are written to Flask's logger with structured format for easy parsing.

For a personal app, this provides forensic capability without the overhead
of a separate audit table (which would increase database storage).

Key operations logged:
- User authentication (login, logout, password reset)
- Financial data changes (expense create/delete, income create/delete)
- Budget period operations (create, delete, recalculate)
- Administrative actions (data deletion, token cleanup)
"""

from flask import current_app, request
from flask_jwt_extended import get_jwt_identity
from datetime import datetime, timezone


def get_client_info():
    """Get client info for audit context."""
    return {
        "ip": request.remote_addr if request else None,
        "user_agent": request.user_agent.string if request else None,
    }


def log_audit_event(event_type, action, details=None, user_id=None):
    """
    Log an audit event with structured data.

    Args:
        event_type: Category of event (auth, expense, income, budget, admin)
        action: Specific action (create, update, delete, login, etc.)
        details: Optional dict with additional context
        user_id: User ID (auto-detected from JWT if not provided)

    Example:
        log_audit_event("expense", "create", {"expense_id": 123, "amount": 1500})
    """
    if user_id is None:
        try:
            user_id = get_jwt_identity()
        except RuntimeError:
            user_id = None

    client_info = get_client_info()

    audit_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "action": action,
        "user_id": user_id,
        "ip": client_info["ip"],
        "details": details or {},
    }

    # Log at INFO level - these are important operational events
    current_app.logger.info(f"[AUDIT] {event_type}.{action}: {audit_entry}")


# Convenience functions for common operations


def log_auth_event(action, user_id=None, success=True, reason=None):
    """Log authentication events (login, logout, password reset)."""
    details = {"success": success}
    if reason:
        details["reason"] = reason
    log_audit_event("auth", action, details, user_id)


def log_expense_event(action, expense_id=None, amount=None, category=None):
    """Log expense operations."""
    details = {}
    if expense_id:
        details["expense_id"] = expense_id
    if amount:
        details["amount"] = amount
    if category:
        details["category"] = category
    log_audit_event("expense", action, details)


def log_income_event(action, income_id=None, amount=None, income_type=None):
    """Log income operations."""
    details = {}
    if income_id:
        details["income_id"] = income_id
    if amount:
        details["amount"] = amount
    if income_type:
        details["type"] = income_type
    log_audit_event("income", action, details)


def log_budget_event(action, period_id=None, period_type=None, details=None):
    """Log budget period operations."""
    event_details = details or {}
    if period_id:
        event_details["period_id"] = period_id
    if period_type:
        event_details["period_type"] = period_type
    log_audit_event("budget", action, event_details)


def log_admin_event(action, details=None):
    """Log administrative operations."""
    log_audit_event("admin", action, details)
