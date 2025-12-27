"""
Error Handling Utilities

Provides standardized error handling patterns for API routes.
- Prevents information leakage to clients
- Ensures consistent logging
- Distinguishes database errors from application errors
"""

from flask import jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from functools import wraps


def handle_route_errors(operation_name):
    """
    Decorator for standardized error handling in API routes.

    Usage:
        @handle_route_errors("create_expense")
        def create_expense():
            ...

    Catches:
        - IntegrityError: Returns 409 Conflict
        - SQLAlchemyError: Returns 500 with generic DB error message
        - Exception: Returns 500 with generic server error message

    All errors are logged with context for debugging.
    """

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except IntegrityError as e:
                from backend.models.database import db

                db.session.rollback()
                current_app.logger.warning(
                    f"[{operation_name}] Integrity constraint violation: {str(e)}",
                    exc_info=True,
                )
                return (
                    jsonify({"error": "A record with this data already exists."}),
                    409,
                )
            except SQLAlchemyError as e:
                from backend.models.database import db

                db.session.rollback()
                current_app.logger.error(
                    f"[{operation_name}] Database error: {str(e)}", exc_info=True
                )
                return (
                    jsonify({"error": "Database operation failed. Please try again."}),
                    500,
                )
            except Exception as e:
                from backend.models.database import db

                db.session.rollback()
                current_app.logger.error(
                    f"[{operation_name}] Unexpected error: {str(e)}", exc_info=True
                )
                return (
                    jsonify(
                        {"error": "An unexpected error occurred. Please try again."}
                    ),
                    500,
                )

        return wrapper

    return decorator


def log_and_return_error(operation_name, error, status_code=500, user_message=None):
    """
    Log an error and return a safe JSON response.

    Args:
        operation_name: Name of the operation for logging context
        error: The exception that was caught
        status_code: HTTP status code to return (default 500)
        user_message: Optional custom message to return to client

    Returns:
        Tuple of (jsonify response, status_code)
    """
    from backend.models.database import db

    # Always rollback on errors
    try:
        db.session.rollback()
    except Exception:
        pass  # Session might already be invalidated

    # Log with full context
    current_app.logger.error(f"[{operation_name}] Error: {str(error)}", exc_info=True)

    # Return safe message to client
    if user_message:
        message = user_message
    elif status_code == 409:
        message = "A record with this data already exists."
    elif status_code == 404:
        message = "The requested resource was not found."
    elif status_code == 400:
        message = "Invalid request data."
    else:
        message = "An unexpected error occurred. Please try again."

    return jsonify({"error": message}), status_code


def safe_db_operation(
    operation_name, user_message="Operation failed. Please try again."
):
    """
    Context manager for safe database operations with automatic rollback.

    Usage:
        with safe_db_operation("update_goal") as handle_error:
            # database operations
            db.session.commit()
            return jsonify({"success": True}), 200
        # If exception occurs, handle_error is called automatically

    Note: This is an alternative to the decorator for more complex flows.
    """

    class SafeDBContext:
        def __init__(self, op_name, msg):
            self.operation_name = op_name
            self.user_message = msg
            self.error_response = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            if exc_type is not None:
                from backend.models.database import db

                db.session.rollback()

                if exc_type == IntegrityError:
                    current_app.logger.warning(
                        f"[{self.operation_name}] Integrity error: {exc_val}",
                        exc_info=(exc_type, exc_val, exc_tb),
                    )
                    self.error_response = (
                        jsonify({"error": "A record with this data already exists."}),
                        409,
                    )
                elif issubclass(exc_type, SQLAlchemyError):
                    current_app.logger.error(
                        f"[{self.operation_name}] Database error: {exc_val}",
                        exc_info=(exc_type, exc_val, exc_tb),
                    )
                    self.error_response = (
                        jsonify(
                            {"error": "Database operation failed. Please try again."}
                        ),
                        500,
                    )
                else:
                    current_app.logger.error(
                        f"[{self.operation_name}] Unexpected error: {exc_val}",
                        exc_info=(exc_type, exc_val, exc_tb),
                    )
                    self.error_response = (jsonify({"error": self.user_message}), 500)
                return True  # Suppress exception
            return False

    return SafeDBContext(operation_name, user_message)
