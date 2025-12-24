"""
Currency API Routes

Provides endpoints for:
- GET /currencies - List supported currencies
- GET /currencies/rates - Get current exchange rates
- POST /currencies/convert - Convert amount between currencies
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.services.currency_service import (
    get_supported_currencies,
    get_exchange_rate,
    convert_amount,
    refresh_rates,
    SUPPORTED_CURRENCIES,
)

currency_bp = Blueprint("currency", __name__)


@currency_bp.route("/currencies", methods=["GET"])
@jwt_required()
def list_currencies():
    """
    Get list of supported currencies with metadata.

    Returns:
        JSON array of currency objects with code, name, symbol (no flags)
    """
    currencies = get_supported_currencies()
    return jsonify({"currencies": currencies}), 200


@currency_bp.route("/currencies/rates", methods=["GET"])
@jwt_required()
def get_rates():
    """
    Get exchange rates for a base currency.

    Query params:
        base: Base currency code (default: EUR)

    Returns:
        JSON object with base currency and rates to all other currencies
    """
    base = request.args.get("base", "EUR").upper()

    if base not in SUPPORTED_CURRENCIES:
        return jsonify({"error": f"Unsupported currency: {base}"}), 400

    rates = {}
    for target in SUPPORTED_CURRENCIES:
        if target != base:
            rate = get_exchange_rate(base, target)
            if rate is not None:
                rates[target] = round(rate, 6)

    return jsonify({"base": base, "rates": rates}), 200


@currency_bp.route("/currencies/convert", methods=["POST"])
@jwt_required()
def convert():
    """
    Convert amount between currencies.

    Request body:
        amount: Amount in cents (integer)
        from_currency: Source currency code
        to_currency: Target currency code
        date: Optional date for historical rate (YYYY-MM-DD)

    Returns:
        JSON with original and converted amounts
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing request body"}), 400

    amount = data.get("amount")
    from_currency = data.get("from_currency", "EUR").upper()
    to_currency = data.get("to_currency", "EUR").upper()
    rate_date = data.get("date")  # Optional

    if amount is None:
        return jsonify({"error": "Amount is required"}), 400

    if not isinstance(amount, int):
        return jsonify({"error": "Amount must be an integer (cents)"}), 400

    if from_currency not in SUPPORTED_CURRENCIES:
        return jsonify({"error": f"Unsupported source currency: {from_currency}"}), 400

    if to_currency not in SUPPORTED_CURRENCIES:
        return jsonify({"error": f"Unsupported target currency: {to_currency}"}), 400

    # Parse date if provided
    from datetime import datetime

    parsed_date = None
    if rate_date:
        try:
            parsed_date = datetime.strptime(rate_date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    converted = convert_amount(amount, from_currency, to_currency, parsed_date)

    if converted is None:
        return (
            jsonify({"error": "Could not fetch exchange rate. Try again later."}),
            503,
        )

    rate = get_exchange_rate(from_currency, to_currency, parsed_date)

    return (
        jsonify(
            {
                "original_amount": amount,
                "original_currency": from_currency,
                "converted_amount": converted,
                "converted_currency": to_currency,
                "rate": round(rate, 6) if rate else None,
            }
        ),
        200,
    )


@currency_bp.route("/currencies/refresh", methods=["POST"])
@jwt_required()
def refresh_currency_rates():
    """
    Trigger refresh of exchange rates from API.

    Should be called sparingly (e.g., daily) to respect API limits.
    """
    success = refresh_rates()

    if success:
        return jsonify({"message": "Exchange rates refreshed successfully"}), 200
    else:
        return jsonify({"error": "Failed to refresh exchange rates"}), 503
