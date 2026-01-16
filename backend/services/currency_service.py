"""
Currency Service - Exchange rate management and currency conversion.

Provides exchange rate fetching, rate caching, and currency conversion
utilities for multi-currency transaction support.

API: fawazahmed0/exchange-api (200+ currencies, CDN-backed, no rate limits)
- Primary: cdn.jsdelivr.net
- Fallback: currency-api.pages.dev
Source: https://github.com/fawazahmed0/exchange-api
"""

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional
import requests

from backend.models.database import db, ExchangeRate

# Supported currencies (ISO 4217 codes)
# All 165 currencies from ExchangeRate-API
SUPPORTED_CURRENCIES = [
    "AED",
    "AFN",
    "ALL",
    "AMD",
    "ANG",
    "AOA",
    "ARS",
    "AUD",
    "AWG",
    "AZN",
    "BAM",
    "BBD",
    "BDT",
    "BGN",
    "BHD",
    "BIF",
    "BMD",
    "BND",
    "BOB",
    "BRL",
    "BSD",
    "BTN",
    "BWP",
    "BYN",
    "BZD",
    "CAD",
    "CDF",
    "CHF",
    "CLF",
    "CLP",
    "CNH",
    "CNY",
    "COP",
    "CRC",
    "CUP",
    "CVE",
    "CZK",
    "DJF",
    "DKK",
    "DOP",
    "DZD",
    "EGP",
    "ERN",
    "ETB",
    "EUR",
    "FJD",
    "FKP",
    "FOK",
    "GBP",
    "GEL",
    "GGP",
    "GHS",
    "GIP",
    "GMD",
    "GNF",
    "GTQ",
    "GYD",
    "HKD",
    "HNL",
    "HRK",
    "HTG",
    "HUF",
    "IDR",
    "ILS",
    "IMP",
    "INR",
    "IQD",
    "IRR",
    "ISK",
    "JEP",
    "JMD",
    "JOD",
    "JPY",
    "KES",
    "KGS",
    "KHR",
    "KID",
    "KMF",
    "KRW",
    "KWD",
    "KYD",
    "KZT",
    "LAK",
    "LBP",
    "LKR",
    "LRD",
    "LSL",
    "LYD",
    "MAD",
    "MDL",
    "MGA",
    "MKD",
    "MMK",
    "MNT",
    "MOP",
    "MRU",
    "MUR",
    "MVR",
    "MWK",
    "MXN",
    "MYR",
    "MZN",
    "NAD",
    "NGN",
    "NIO",
    "NOK",
    "NPR",
    "NZD",
    "OMR",
    "PAB",
    "PEN",
    "PGK",
    "PHP",
    "PKR",
    "PLN",
    "PYG",
    "QAR",
    "RON",
    "RSD",
    "RUB",
    "RWF",
    "SAR",
    "SBD",
    "SCR",
    "SDG",
    "SEK",
    "SGD",
    "SHP",
    "SLE",
    "SOS",
    "SRD",
    "SSP",
    "STN",
    "SYP",
    "SZL",
    "THB",
    "TJS",
    "TMT",
    "TND",
    "TOP",
    "TRY",
    "TTD",
    "TVD",
    "TWD",
    "TZS",
    "UAH",
    "UGX",
    "USD",
    "UYU",
    "UZS",
    "VES",
    "VND",
    "VUV",
    "WST",
    "XAF",
    "XCD",
    "XDR",
    "XOF",
    "XPF",
    "YER",
    "ZAR",
    "ZMW",
    "ZWL",
]

# Currency metadata for UI display (common currencies with symbols)
# Note: Flag emojis removed per user request for better compatibility
CURRENCY_INFO = {
    "AED": {"name": "UAE Dirham", "symbol": "د.إ"},
    "AFN": {"name": "Afghan Afghani", "symbol": "؋"},
    "ALL": {"name": "Albanian Lek", "symbol": "L"},
    "AMD": {"name": "Armenian Dram", "symbol": "֏"},
    "ANG": {"name": "Netherlands Antillian Guilder", "symbol": "ƒ"},
    "AOA": {"name": "Angolan Kwanza", "symbol": "Kz"},
    "ARS": {"name": "Argentine Peso", "symbol": "$"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$"},
    "AWG": {"name": "Aruban Florin", "symbol": "ƒ"},
    "AZN": {"name": "Azerbaijani Manat", "symbol": "₼"},
    "BAM": {"name": "Bosnia and Herzegovina Mark", "symbol": "KM"},
    "BBD": {"name": "Barbados Dollar", "symbol": "$"},
    "BDT": {"name": "Bangladeshi Taka", "symbol": "৳"},
    "BGN": {"name": "Bulgarian Lev", "symbol": "лв"},
    "BHD": {"name": "Bahraini Dinar", "symbol": ".د.ب"},
    "BIF": {"name": "Burundian Franc", "symbol": "FBu"},
    "BMD": {"name": "Bermudian Dollar", "symbol": "$"},
    "BND": {"name": "Brunei Dollar", "symbol": "$"},
    "BOB": {"name": "Bolivian Boliviano", "symbol": "Bs."},
    "BRL": {"name": "Brazilian Real", "symbol": "R$"},
    "BSD": {"name": "Bahamian Dollar", "symbol": "$"},
    "BTN": {"name": "Bhutanese Ngultrum", "symbol": "Nu."},
    "BWP": {"name": "Botswana Pula", "symbol": "P"},
    "BYN": {"name": "Belarusian Ruble", "symbol": "Br"},
    "BZD": {"name": "Belize Dollar", "symbol": "BZ$"},
    "CAD": {"name": "Canadian Dollar", "symbol": "CA$"},
    "CDF": {"name": "Congolese Franc", "symbol": "FC"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF"},
    "CLF": {"name": "Chilean Unidad de Fomento", "symbol": "UF"},
    "CLP": {"name": "Chilean Peso", "symbol": "$"},
    "CNH": {"name": "Offshore Chinese Renminbi", "symbol": "¥"},
    "CNY": {"name": "Chinese Renminbi", "symbol": "¥"},
    "COP": {"name": "Colombian Peso", "symbol": "$"},
    "CRC": {"name": "Costa Rican Colon", "symbol": "₡"},
    "CUP": {"name": "Cuban Peso", "symbol": "$"},
    "CVE": {"name": "Cape Verdean Escudo", "symbol": "$"},
    "CZK": {"name": "Czech Koruna", "symbol": "Kč"},
    "DJF": {"name": "Djiboutian Franc", "symbol": "Fdj"},
    "DKK": {"name": "Danish Krone", "symbol": "kr"},
    "DOP": {"name": "Dominican Peso", "symbol": "RD$"},
    "DZD": {"name": "Algerian Dinar", "symbol": "د.ج"},
    "EGP": {"name": "Egyptian Pound", "symbol": "£"},
    "ERN": {"name": "Eritrean Nakfa", "symbol": "Nfk"},
    "ETB": {"name": "Ethiopian Birr", "symbol": "Br"},
    "EUR": {"name": "Euro", "symbol": "€"},
    "FJD": {"name": "Fiji Dollar", "symbol": "$"},
    "FKP": {"name": "Falkland Islands Pound", "symbol": "£"},
    "FOK": {"name": "Faroese Króna", "symbol": "kr"},
    "GBP": {"name": "Pound Sterling", "symbol": "£"},
    "GEL": {"name": "Georgian Lari", "symbol": "₾"},
    "GGP": {"name": "Guernsey Pound", "symbol": "£"},
    "GHS": {"name": "Ghanaian Cedi", "symbol": "₵"},
    "GIP": {"name": "Gibraltar Pound", "symbol": "£"},
    "GMD": {"name": "Gambian Dalasi", "symbol": "D"},
    "GNF": {"name": "Guinean Franc", "symbol": "FG"},
    "GTQ": {"name": "Guatemalan Quetzal", "symbol": "Q"},
    "GYD": {"name": "Guyanese Dollar", "symbol": "$"},
    "HKD": {"name": "Hong Kong Dollar", "symbol": "HK$"},
    "HNL": {"name": "Honduran Lempira", "symbol": "L"},
    "HRK": {"name": "Croatian Kuna", "symbol": "kn"},
    "HTG": {"name": "Haitian Gourde", "symbol": "G"},
    "HUF": {"name": "Hungarian Forint", "symbol": "Ft"},
    "IDR": {"name": "Indonesian Rupiah", "symbol": "Rp"},
    "ILS": {"name": "Israeli New Shekel", "symbol": "₪"},
    "IMP": {"name": "Manx Pound", "symbol": "£"},
    "INR": {"name": "Indian Rupee", "symbol": "₹"},
    "IQD": {"name": "Iraqi Dinar", "symbol": "ع.د"},
    "IRR": {"name": "Iranian Rial", "symbol": "﷼"},
    "ISK": {"name": "Icelandic Króna", "symbol": "kr"},
    "JEP": {"name": "Jersey Pound", "symbol": "£"},
    "JMD": {"name": "Jamaican Dollar", "symbol": "J$"},
    "JOD": {"name": "Jordanian Dinar", "symbol": "د.ا"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥"},
    "KES": {"name": "Kenyan Shilling", "symbol": "KSh"},
    "KGS": {"name": "Kyrgyzstani Som", "symbol": "с"},
    "KHR": {"name": "Cambodian Riel", "symbol": "៛"},
    "KID": {"name": "Kiribati Dollar", "symbol": "$"},
    "KMF": {"name": "Comorian Franc", "symbol": "CF"},
    "KRW": {"name": "South Korean Won", "symbol": "₩"},
    "KWD": {"name": "Kuwaiti Dinar", "symbol": "د.ك"},
    "KYD": {"name": "Cayman Islands Dollar", "symbol": "$"},
    "KZT": {"name": "Kazakhstani Tenge", "symbol": "₸"},
    "LAK": {"name": "Lao Kip", "symbol": "₭"},
    "LBP": {"name": "Lebanese Pound", "symbol": "ل.ل"},
    "LKR": {"name": "Sri Lanka Rupee", "symbol": "Rs"},
    "LRD": {"name": "Liberian Dollar", "symbol": "$"},
    "LSL": {"name": "Lesotho Loti", "symbol": "L"},
    "LYD": {"name": "Libyan Dinar", "symbol": "ل.د"},
    "MAD": {"name": "Moroccan Dirham", "symbol": "د.م."},
    "MDL": {"name": "Moldovan Leu", "symbol": "L"},
    "MGA": {"name": "Malagasy Ariary", "symbol": "Ar"},
    "MKD": {"name": "Macedonian Denar", "symbol": "ден"},
    "MMK": {"name": "Burmese Kyat", "symbol": "K"},
    "MNT": {"name": "Mongolian Tögrög", "symbol": "₮"},
    "MOP": {"name": "Macanese Pataca", "symbol": "P"},
    "MRU": {"name": "Mauritanian Ouguiya", "symbol": "UM"},
    "MUR": {"name": "Mauritian Rupee", "symbol": "₨"},
    "MVR": {"name": "Maldivian Rufiyaa", "symbol": "ރ."},
    "MWK": {"name": "Malawian Kwacha", "symbol": "MK"},
    "MXN": {"name": "Mexican Peso", "symbol": "MX$"},
    "MYR": {"name": "Malaysian Ringgit", "symbol": "RM"},
    "MZN": {"name": "Mozambican Metical", "symbol": "MT"},
    "NAD": {"name": "Namibian Dollar", "symbol": "$"},
    "NGN": {"name": "Nigerian Naira", "symbol": "₦"},
    "NIO": {"name": "Nicaraguan Córdoba", "symbol": "C$"},
    "NOK": {"name": "Norwegian Krone", "symbol": "kr"},
    "NPR": {"name": "Nepalese Rupee", "symbol": "₨"},
    "NZD": {"name": "New Zealand Dollar", "symbol": "NZ$"},
    "OMR": {"name": "Omani Rial", "symbol": "ر.ع."},
    "PAB": {"name": "Panamanian Balboa", "symbol": "B/."},
    "PEN": {"name": "Peruvian Sol", "symbol": "S/"},
    "PGK": {"name": "Papua New Guinean Kina", "symbol": "K"},
    "PHP": {"name": "Philippine Peso", "symbol": "₱"},
    "PKR": {"name": "Pakistani Rupee", "symbol": "₨"},
    "PLN": {"name": "Polish Złoty", "symbol": "zł"},
    "PYG": {"name": "Paraguayan Guaraní", "symbol": "₲"},
    "QAR": {"name": "Qatari Riyal", "symbol": "ر.ق"},
    "RON": {"name": "Romanian Leu", "symbol": "lei"},
    "RSD": {"name": "Serbian Dinar", "symbol": "дин"},
    "RUB": {"name": "Russian Ruble", "symbol": "₽"},
    "RWF": {"name": "Rwandan Franc", "symbol": "FRw"},
    "SAR": {"name": "Saudi Riyal", "symbol": "ر.س"},
    "SBD": {"name": "Solomon Islands Dollar", "symbol": "$"},
    "SCR": {"name": "Seychellois Rupee", "symbol": "₨"},
    "SDG": {"name": "Sudanese Pound", "symbol": "ج.س."},
    "SEK": {"name": "Swedish Krona", "symbol": "kr"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$"},
    "SHP": {"name": "Saint Helena Pound", "symbol": "£"},
    "SLE": {"name": "Sierra Leonean Leone", "symbol": "Le"},
    "SOS": {"name": "Somali Shilling", "symbol": "Sh"},
    "SRD": {"name": "Surinamese Dollar", "symbol": "$"},
    "SSP": {"name": "South Sudanese Pound", "symbol": "£"},
    "STN": {"name": "São Tomé and Príncipe Dobra", "symbol": "Db"},
    "SYP": {"name": "Syrian Pound", "symbol": "£"},
    "SZL": {"name": "Eswatini Lilangeni", "symbol": "L"},
    "THB": {"name": "Thai Baht", "symbol": "฿"},
    "TJS": {"name": "Tajikistani Somoni", "symbol": "ЅМ"},
    "TMT": {"name": "Turkmenistan Manat", "symbol": "m"},
    "TND": {"name": "Tunisian Dinar", "symbol": "د.ت"},
    "TOP": {"name": "Tongan Paʻanga", "symbol": "T$"},
    "TRY": {"name": "Turkish Lira", "symbol": "₺"},
    "TTD": {"name": "Trinidad and Tobago Dollar", "symbol": "TT$"},
    "TVD": {"name": "Tuvaluan Dollar", "symbol": "$"},
    "TWD": {"name": "New Taiwan Dollar", "symbol": "NT$"},
    "TZS": {"name": "Tanzanian Shilling", "symbol": "TSh"},
    "UAH": {"name": "Ukrainian Hryvnia", "symbol": "₴"},
    "UGX": {"name": "Ugandan Shilling", "symbol": "USh"},
    "USD": {"name": "US Dollar", "symbol": "$"},
    "UYU": {"name": "Uruguayan Peso", "symbol": "$U"},
    "UZS": {"name": "Uzbekistani So'm", "symbol": "so'm"},
    "VES": {"name": "Venezuelan Bolívar Soberano", "symbol": "Bs."},
    "VND": {"name": "Vietnamese Đồng", "symbol": "₫"},
    "VUV": {"name": "Vanuatu Vatu", "symbol": "Vt"},
    "WST": {"name": "Samoan Tālā", "symbol": "T"},
    "XAF": {"name": "Central African CFA Franc", "symbol": "FCFA"},
    "XCD": {"name": "East Caribbean Dollar", "symbol": "$"},
    "XDR": {"name": "Special Drawing Rights", "symbol": "SDR"},
    "XOF": {"name": "West African CFA franc", "symbol": "CFA"},
    "XPF": {"name": "CFP Franc", "symbol": "₣"},
    "YER": {"name": "Yemeni Rial", "symbol": "﷼"},
    "ZAR": {"name": "South African Rand", "symbol": "R"},
    "ZMW": {"name": "Zambian Kwacha", "symbol": "ZK"},
    "ZWL": {"name": "Zimbabwean Dollar", "symbol": "$"},
}

# Exchange rate API configuration (fawazahmed0/exchange-api)
# Primary CDN-backed endpoint (faster, no rate limits)
EXCHANGE_API_PRIMARY = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api"
# Cloudflare fallback endpoint
EXCHANGE_API_FALLBACK = "https://{date}.currency-api.pages.dev"

# Cache expiry: rates are considered stale after this many hours
CACHE_EXPIRY_HOURS = 24


def get_all_rates(base_currency: str = "EUR") -> Dict[str, float]:
    """
    Get all exchange rates for a base currency efficiently.

    This function first checks the cache for all rates. If any rates are
    missing or stale, it refreshes ALL rates with a single API call,
    then returns from cache. This avoids N individual API calls.

    Args:
        base_currency: Base currency code (e.g., 'EUR')

    Returns:
        Dictionary mapping target currency codes to exchange rates
    """
    from datetime import date, datetime, timedelta, timezone

    base = base_currency.upper()
    today = date.today()
    rates = {}

    # First, try to get all rates from cache
    cached_rates = ExchangeRate.query.filter_by(
        base_currency=base, rate_date=today
    ).all()

    # Check if we have fresh cached rates
    needs_refresh = False
    if not cached_rates:
        needs_refresh = True
    else:
        # Check if any cached rate is stale
        for cached in cached_rates:
            if cached.fetched_at:
                expiry = cached.fetched_at + timedelta(hours=CACHE_EXPIRY_HOURS)
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > expiry:
                    needs_refresh = True
                    break

    # Refresh all rates with single API call if needed
    if needs_refresh:
        refresh_rates(base)
        # Re-fetch from cache after refresh
        cached_rates = ExchangeRate.query.filter_by(
            base_currency=base, rate_date=today
        ).all()

    # Build rates dictionary from cache
    for cached in cached_rates:
        if (
            cached.target_currency != base
            and cached.target_currency in SUPPORTED_CURRENCIES
        ):
            rates[cached.target_currency] = round(cached.rate, 6)

    return rates


def get_supported_currencies() -> List[Dict]:
    """
    Get list of supported currencies with metadata.

    Returns:
        List of currency objects with code, name, symbol (no flags)
    """
    return [
        {
            "code": code,
            "name": CURRENCY_INFO.get(code, {}).get("name", code),
            "symbol": CURRENCY_INFO.get(code, {}).get("symbol", code),
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
    Uses fawazahmed0/exchange-api (CDN-backed, no rate limits).

    Args:
        base_currency: Base currency to fetch rates for

    Returns:
        True if refresh succeeded, False otherwise
    """
    base_lower = base_currency.lower()

    # Build URLs for primary and fallback endpoints
    primary_url = f"{EXCHANGE_API_PRIMARY}@latest/v1/currencies/{base_lower}.min.json"
    fallback_url = (
        f"{EXCHANGE_API_FALLBACK.format(date='latest')}/v1/currencies/"
        f"{base_lower}.min.json"
    )

    data = None

    # Try primary endpoint first
    try:
        response = requests.get(primary_url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Primary API failed, trying fallback: {e}")

    # Try fallback if primary failed
    if data is None:
        try:
            response = requests.get(fallback_url, timeout=10)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Fallback API also failed: {e}")
            return False

    try:
        # Parse date from response
        rate_date_str = data.get("date")
        if rate_date_str:
            rate_date = datetime.strptime(rate_date_str, "%Y-%m-%d").date()
        else:
            rate_date = date.today()

        # Get rates (key is lowercase currency code)
        rates = data.get(base_lower, {})

        if not rates:
            print(f"No rates found for {base_currency}")
            return False

        # Cache all rates (API returns lowercase keys)
        for target_lower, rate in rates.items():
            target = target_lower.upper()
            if target in SUPPORTED_CURRENCIES:
                _cache_rate(base_currency, target, rate_date, rate)
                # Also cache inverse rate
                if rate > 0:
                    _cache_rate(target, base_currency, rate_date, 1 / rate)

        return True

    except Exception as e:
        print(f"Failed to parse exchange rates: {e}")
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
        # Handle naive datetime from SQLite/legacy data
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expiry:
            return None  # Stale, need to refetch

    return cached.rate


def _cache_rate(base: str, target: str, rate_date: date, rate: float) -> None:
    """
    Store rate in cache, updating if exists.
    Uses upsert pattern to handle concurrent requests safely.
    """
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    try:
        # Try PostgreSQL upsert first (production)
        stmt = pg_insert(ExchangeRate).values(
            base_currency=base,
            target_currency=target,
            rate=rate,
            rate_date=rate_date,
            fetched_at=datetime.now(timezone.utc),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["base_currency", "target_currency", "rate_date"],
            set_={"rate": rate, "fetched_at": datetime.now(timezone.utc)},
        )
        db.session.execute(stmt)
        db.session.commit()
    except Exception:
        # Fallback for SQLite (development) - use traditional check-then-insert
        db.session.rollback()
        existing = ExchangeRate.query.filter_by(
            base_currency=base, target_currency=target, rate_date=rate_date
        ).first()

        if existing:
            existing.rate = rate
            existing.fetched_at = datetime.now(timezone.utc)
        else:
            try:
                new_rate = ExchangeRate(
                    base_currency=base,
                    target_currency=target,
                    rate=rate,
                    rate_date=rate_date,
                    fetched_at=datetime.now(timezone.utc),
                )
                db.session.add(new_rate)
                db.session.commit()
            except Exception:
                # Race condition hit - another request inserted, just update
                db.session.rollback()
                existing = ExchangeRate.query.filter_by(
                    base_currency=base,
                    target_currency=target,
                    rate_date=rate_date,
                ).first()
                if existing:
                    existing.rate = rate
                    existing.fetched_at = datetime.now(timezone.utc)
                    db.session.commit()


def _fetch_rate_from_api(base: str, target: str, rate_date: date) -> Optional[float]:
    """
    Fetch exchange rate from fawazahmed0/exchange-api.

    Supports historical dates (YYYY-MM-DD format) and has fallback endpoint.
    """
    base_lower = base.lower()
    target_lower = target.lower()

    # Use "latest" for today, otherwise use the specific date
    date_str = "latest" if rate_date >= date.today() else rate_date.strftime("%Y-%m-%d")

    # Build URLs for primary and fallback endpoints
    primary_url = (
        f"{EXCHANGE_API_PRIMARY}@{date_str}/v1/currencies/{base_lower}.min.json"
    )
    fallback_url = (
        f"{EXCHANGE_API_FALLBACK.format(date=date_str)}/v1/currencies/"
        f"{base_lower}.min.json"
    )

    data = None

    # Try primary endpoint first
    try:
        response = requests.get(primary_url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Primary API failed for {base}/{target}: {e}")

    # Try fallback if primary failed
    if data is None:
        try:
            response = requests.get(fallback_url, timeout=10)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Fallback API also failed for {base}/{target}: {e}")
            return None

    try:
        # Get rates (key is lowercase currency code)
        rates = data.get(base_lower, {})
        return rates.get(target_lower)

    except Exception as e:
        print(f"Failed to parse exchange rate: {e}")
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
