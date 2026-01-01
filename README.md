# Bloom

> Financial Habits That Grow With You

A balance-based budget tracker with flexible salary period planning. Track expenses across debit and credit cards, manage debts with payoff projections, and hit your savings goals.

**🌐 Live:** [https://bloom-tracker.app](https://bloom-tracker.app)

**📱 Progressive Web App:** Install on any device for offline access!

## ✨ Features

### 💰 Balance-Based Budgeting

-   **Flexible Sub-Periods**: Divide your budget into 1 to N periods (default 4 weekly)
-   **Smart Carryover**: Overspend Period 1? Period 2's budget auto-adjusts
-   **Wizard Setup**: 3-step wizard - enter balances, review fixed bills, confirm budget
-   **Dual Card Tracking**: Separate debit and credit balance monitoring

### 📊 Transaction Management

-   **Quick Entry**: Pre-filled defaults, 3 clicks to add an expense
-   **Bank Import**: Paste transactions directly from your bank statement
-   **European Date Format**: DD/MM/YYYY throughout
-   **Smart Categorization**: Auto-categorizes common merchants (Wolt → Food, Netflix → Entertainment)

### 🔄 Recurring Expenses

-   **On-Demand Generation**: Preview scheduled expenses and confirm when ready
-   **Configurable Lookahead**: Choose how far ahead to preview (7-90 days)
-   **Fixed Bills Toggle**: Mark essential bills to exclude from weekly budget

### 💳 Debt Management

-   **Progress Tracking**: Visual progress bars with payoff projections
-   **Auto-Archive**: Paid-off debts automatically archive
-   **Payment History**: Expandable payment log per debt
-   **Credit Card Integration**: Credit card debt shown on Debts page

### 🎯 Goals & Savings

-   **Savings Goals**: Set targets with progress tracking
-   **Visual Progress**: See how close you are to each goal
-   **Category Integration**: Goals linked to expense categories

### 📤 Data Export/Import

-   **JSON Export**: Full backup for re-importing
-   **CSV Export**: Weekly budget breakdowns for spreadsheet analysis
-   **Selective Export**: Choose periods, transactions, debts, or settings

### 🎨 User Experience

-   **Dark Mode**: Warm plum-tinted theme with system/manual toggle
-   **Mobile-First**: Responsive design with hamburger navigation
-   **Draggable FAB**: Floating action button you can reposition
-   **Custom Categories**: Create your own subcategories per expense type
-   **Offline Support**: Works without internet after first visit

### 🔒 Security

-   **Secure Auth**: HttpOnly cookie-based JWT (no localStorage tokens)
-   **Account Lockout**: Auto-locks after failed login attempts
-   **Password Reset**: Email-based reset flow via SendGrid
-   **Rate Limiting**: Protected against brute force attacks

## Tech Stack

| Layer        | Technology                                     |
| ------------ | ---------------------------------------------- |
| **Frontend** | React 18 + Vite                                |
| **Styling**  | Tailwind CSS                                   |
| **Backend**  | Flask (Python 3.11)                            |
| **Database** | PostgreSQL (Neon - serverless)                 |
| **Auth**     | JWT in HttpOnly cookies                        |
| **Email**    | SendGrid                                       |
| **Hosting**  | Cloudflare Pages (Frontend) + Render (Backend) |
| **PWA**      | Workbox + vite-plugin-pwa                      |

## Quick Start

### Prerequisites

-   Python 3.8+
-   Node.js 16+

### Installation

```powershell
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### Development

```powershell
.\start.ps1   # Runs backend (:5000) + frontend (:3000) concurrently
```

Or manually:

```powershell
# Terminal 1 - Backend
python run.py

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Access at `http://localhost:3000`

### Test Account

-   **Email:** `test@test.com`
-   **Password:** `test`

### Contributing

**Always use Pull Requests** - never push directly to `main`. See [DEVELOPMENT_REFERENCE.md](DEVELOPMENT_REFERENCE.md) for the full PR workflow.

## 🗺️ Roadmap

### In Progress

-   🔧 Day-by-day transaction navigation (#92)
-   🔧 Comprehensive calculation audit (#94)

### Planned Features

-   📋 End-of-period smart suggestions (#1)
-   📋 Budget categories with spending limits (#2)
-   📋 Reports & analytics dashboard (#3)
-   📋 Notifications & reminders (#6)
-   📋 Multi-currency support (#7)
-   📋 Receipt OCR scanning (#8)
-   📋 Google Calendar integration (#25)

### Technical Improvements

-   🔧 Redis-based rate limiting (#32)
-   🔧 Email verification flow (#33)
-   🔧 Sentry error tracking (#38)

## Project Structure

```
bloom-budget-tracker/
├── backend/                 # Flask API
│   ├── models/             # SQLAlchemy models
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic (balance calculations)
│   └── migrations/         # Database migrations (Flask-Migrate)
├── frontend/               # React + Vite app
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Dashboard, Debts, Goals, Settings, etc.
│       └── contexts/       # Theme, Feature Flags
├── scripts/                # Maintenance & migration utilities
├── docs/                   # Documentation
└── start.ps1              # Development startup script
```

## Support

📧 **Email:** support@bloom-tracker.app

---

<p align="center">Made with 🌸 for mindful money management</p>
