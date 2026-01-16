"""
Tests for Currency Routes - Public Endpoint Access

Tests that currency-related endpoints work correctly for both
authenticated and unauthenticated users.

Uses mocked API responses to avoid slow network calls and rate limiting.
"""

import pytest
from flask import json
from unittest.mock import patch, MagicMock
from datetime import date


# Mock responses for fawazahmed0/exchange-api (new API format)
# Uses lowercase currency codes and {currency: {rates}} structure
# Note: date must be today's date for cache to work correctly
def get_mock_rates_eur():
    """Get mock EUR rates with today's date for cache compatibility"""
    return {
        "date": date.today().isoformat(),
        "eur": {
            "eur": 1.0,
            "usd": 1.08,
            "gbp": 0.86,
            "aed": 3.97,
        },
    }


def get_mock_rates_usd():
    """Get mock USD rates with today's date for cache compatibility"""
    return {
        "date": date.today().isoformat(),
        "usd": {
            "eur": 0.93,
            "usd": 1.0,
            "gbp": 0.80,
        },
    }


@pytest.fixture(autouse=True)
def mock_currency_api():
    """Mock all external currency API calls to speed up tests"""
    with patch("backend.services.currency_service.requests.get") as mock_get:

        def mock_response(url, **kwargs):
            response = MagicMock()
            response.status_code = 200
            response.raise_for_status = MagicMock()
            # New API uses lowercase currency codes in URL
            if "/usd." in url.lower():
                response.json.return_value = get_mock_rates_usd()
            else:
                response.json.return_value = get_mock_rates_eur()
            return response

        mock_get.side_effect = mock_response
        yield mock_get


def test_list_currencies_public(client):
    """Test that /currencies endpoint works without authentication"""
    response = client.get("/api/v1/currencies")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "currencies" in data
    assert len(data["currencies"]) > 0

    # Verify structure of currency objects
    first_currency = data["currencies"][0]
    assert "code" in first_currency
    assert "name" in first_currency
    assert "symbol" in first_currency


def test_get_rates_public(client):
    """Test that /currencies/rates endpoint works without authentication"""
    response = client.get("/api/v1/currencies/rates?base=EUR")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "base" in data
    assert data["base"] == "EUR"
    assert "rates" in data
    assert isinstance(data["rates"], dict)

    # Verify rates are present (at least one)
    assert len(data["rates"]) > 0


def test_get_rates_different_base_public(client):
    """Test currency rates with different base currency (no auth)"""
    response = client.get("/api/v1/currencies/rates?base=USD")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["base"] == "USD"
    assert "rates" in data


def test_get_rates_invalid_currency_public(client):
    """Test that invalid currency returns 400 (no auth needed)"""
    response = client.get("/api/v1/currencies/rates?base=INVALID")

    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data


def test_convert_requires_auth(client):
    """Test that /currencies/convert still requires authentication"""
    response = client.post(
        "/api/v1/currencies/convert",
        json={"amount": 1000, "from_currency": "EUR", "to_currency": "USD"},
    )

    # Should return 401 Unauthorized
    assert response.status_code == 401


def test_convert_with_auth(client, auth_headers):
    """Test that /currencies/convert works with authentication"""
    response = client.post(
        "/api/v1/currencies/convert",
        json={"amount": 1000, "from_currency": "EUR", "to_currency": "USD"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "original_amount" in data
    assert "converted_amount" in data
    assert "original_currency" in data
    assert "converted_currency" in data


def test_list_currencies_with_auth(client, auth_headers):
    """Test that /currencies also works WITH authentication"""
    response = client.get("/api/v1/currencies", headers=auth_headers)

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "currencies" in data


def test_get_rates_with_auth(client, auth_headers):
    """Test that /currencies/rates also works WITH authentication"""
    response = client.get("/api/v1/currencies/rates?base=EUR", headers=auth_headers)

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "base" in data
    assert "rates" in data


def test_cache_rate_concurrent_access(app):
    """
    Test that concurrent rate caching doesn't cause duplicate key violations.

    This test simulates the race condition that occurs when multiple Gunicorn
    workers try to cache the same exchange rate simultaneously.
    """
    import concurrent.futures
    from backend.services.currency_service import _cache_rate
    from backend.models.database import db, ExchangeRate
    from datetime import date

    with app.app_context():
        # Clean up any existing test data
        ExchangeRate.query.filter_by(
            base_currency="TEST",
            target_currency="XXX",
        ).delete()
        db.session.commit()

        test_date = date(2099, 12, 25)  # Future date to avoid conflicts

        def cache_same_rate(worker_id):
            """Simulate multiple workers caching the same rate"""
            with app.app_context():
                try:
                    _cache_rate("TEST", "XXX", test_date, 1.5 + (worker_id * 0.001))
                    return "success"
                except Exception as e:
                    return f"error: {str(e)}"

        # Run 5 concurrent "workers" trying to cache the same rate
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(cache_same_rate, i) for i in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All should succeed (no duplicate key errors)
        assert all(r == "success" for r in results), f"Some workers failed: {results}"

        # Verify only one rate exists (not duplicates)
        with app.app_context():
            count = ExchangeRate.query.filter_by(
                base_currency="TEST",
                target_currency="XXX",
                rate_date=test_date,
            ).count()
            assert count == 1, f"Expected 1 rate, found {count}"

            # Clean up
            ExchangeRate.query.filter_by(
                base_currency="TEST",
                target_currency="XXX",
            ).delete()
            db.session.commit()
