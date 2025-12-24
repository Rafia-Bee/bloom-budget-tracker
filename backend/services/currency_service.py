"""
Currency Service - Exchange rate management and currency conversion.

Provides exchange rate fetching from frankfurter.app API, rate caching,
and currency conversion utilities for multi-currency transaction support.

API: frankfurter.app (ECB data, free, no rate limits, no API key required)
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
import requests

from backend.models.database import db, ExchangeRate

# Supported currencies (ISO 4217 codes)
# Start with EUR only, infrastructure ready for expansion
SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "PLN", "SEK", "NOK", "CHF", "DKK"]

# Currency metadata for UI display
CURRENCY_INFO = {
    "EUR": {"name": "Euro", "symbol": "€", "flag": "🇪🇺"},
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
    "GBP": {"name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
    "PLN": {"name": "Polish Złoty", "symbol": "zł", "flag": "🇵🇱"},
    "SEK": {"name": "Swedish Krona", "symbol": "kr", "flag": "🇸🇪"},
    "NOK": {"name": "Norwegian Krone", "symbol": "kr", "flag": "🇳🇴"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF", "flag": "🇨🇭"},
    "DKK": {"name": "Danish Krone", "symbol": "kr", "flag": "🇩🇰"},
}

# frankfurter.app API base URL
FRANKFURTER_API = "https://api.frankfurter.app"

# Cache expiry: rates are considered stale after this many hours
CACHE_EXPIRY_HOURS = 24


def get_supported_currencies() -> List[Dict]:
    """
    Get list of supported currencies with metadata.

    Returns:
        List of currency objects with code, name, symbol, flag
    """
    return [
        {
            "code": code,
            "name": CURRENCY_INFO[code]["name"],
            "symbol": CURRENCY_INFO[code]["symbol"],
            "flag": CURRENCY_INFO[code]["flag"],
        }
        for code in SUPPORTED_CURRENCIES
    ]


def get_exchange_rate(
    base: str, target: str, rate_date: Optional[date] = None
) -> Optional[float]:
    """
    Get exchange rate between two currencies.

    First checks cache, then fetches from API if not found or stale.

    Args:
        base: Base currency code (e.g., 'EUR')
        target: Target currency code (e.g., 'USD')
        rate_date: Date for historical rate (default: today)

    Returns:
        Exchange rate (1 base = X target), or None if unavailable
    """
    if base == target:
        return 1.0

    if base not in SUPPORTED_CURRENCIES or target not in SUPPORTED_CURRENCIES:
        return None

    rate_date = rate_date or date.today()

    # Check cache first
    cached_rate = _get_cached_rate(base, target, rate_date)
    if cached_rate is not None:
        return cached_rate

    # Fetch from API
    rate = _fetch_rate_from_api(base, target, rate_date)
    if rate is not None:
        _cache_rate(base, target, rate_date, rate)

    return rate


def convert_amount(
    amount_cents: int,
    from_currency: str,
    to_currency: str,
    rate_date: Optional[date] = None,
) -> Optional[int]:
    """
    Convert amount from one currency to another.

    Args:
        amount_cents: Amount in cents (integer)
        from_currency: Source currency code
        to_currency: Target currency code
        rate_date: Date for historical rate (default: today)

    Returns:
        Converted amount in cents, or None if conversion failed
    """
    if from_currency == to_currency:
        return amount_cents

    rate = get_exchange_rate(from_currency, to_currency, rate_date)
    if rate is None:
        return None

    # Convert: multiply by rate and round to nearest cent
    converted = round(amount_cents * rate)
    return converted


def refresh_rates(base_currency: str = "EUR") -> bool:
    """
    Refresh exchange rates from API for all supported currencies.

    Called periodically (e.g., daily) to keep cache fresh.

    Args:
        base_currency: Base currency to fetch rates for

    Returns:
        True if refresh succeeded, False otherwise
    """
    try:
        # Fetch latest rates for all currencies at once
        targets = ",".join([c for c in SUPPORTED_CURRENCIES if c != base_currency])
        url = f"{FRANKFURTER_API}/latest?from={base_currency}&to={targets}"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()
        rate_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        rates = data["rates"]

        # Cache all rates
        for target, rate in rates.items():
            _cache_rate(base_currency, target, rate_date, rate)
            # Also cache inverse rate
            if rate > 0:
                _cache_rate(target, base_currency, rate_date, 1 / rate)

        return True

    except Exception as e:
        print(f"Failed to refresh exchange rates: {e}")
        return False


def _get_cached_rate(base: str, target: str, rate_date: date) -> Optional[float]:
    """
    Get rate from cache if exists and not stale.

    For current date rates, checks if cache is within CACHE_EXPIRY_HOURS.
    For historical rates, returns cached value regardless of age.
    """
    cached = ExchangeRate.query.filter_by(
        base_currency=base, target_currency=target, rate_date=rate_date
    ).first()

    if cached is None:
        return None

    # Historical rates don't expire
    if rate_date < date.today():
        return cached.rate

    # Current rates expire after CACHE_EXPIRY_HOURS
    if cached.fetched_at:
        expiry = cached.fetched_at + timedelta(hours=CACHE_EXPIRY_HOURS)
        if datetime.utcnow() > expiry:
            return None  # Stale, need to refetch

    return cached.rate


def _cache_rate(base: str, target: str, rate_date: date, rate: float) -> None:
    """
    Store rate in cache, updating if exists.
    """
    existing = ExchangeRate.query.filter_by(
        base_currency=base, target_currency=target, rate_date=rate_date
    ).first()

    if existing:
        existing.rate = rate
        existing.fetched_at = datetime.utcnow()
    else:
        new_rate = ExchangeRate(
            base_currency=base,
            target_currency=target,
            rate=rate,
            rate_date=rate_date,
            fetched_at=datetime.utcnow(),
        )
        db.session.add(new_rate)

    db.session.commit()


def _fetch_rate_from_api(base: str, target: str, rate_date: date) -> Optional[float]:
    """
    Fetch exchange rate from frankfurter.app API.

    Uses historical endpoint for past dates, latest for today.
    """
    try:
        if rate_date >= date.today():
            url = f"{FRANKFURTER_API}/latest?from={base}&to={target}"
        else:
            date_str = rate_date.strftime("%Y-%m-%d")
            url = f"{FRANKFURTER_API}/{date_str}?from={base}&to={target}"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()
        return data["rates"].get(target)

    except Exception as e:
        print(f"Failed to fetch exchange rate: {e}")
        return None


def format_currency_symbol(currency: str) -> str:
    """
    Get the symbol for a currency code.

    Args:
        currency: ISO 4217 currency code

    Returns:
        Currency symbol (e.g., '€' for EUR)
    """
    return CURRENCY_INFO.get(currency, {}).get("symbol", currency)
