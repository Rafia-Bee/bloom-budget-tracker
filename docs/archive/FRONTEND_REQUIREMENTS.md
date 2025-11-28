# Bloom - Frontend Requirements

**Tagline:** Financial Habits That Grow With You

## Design System

### Color Scheme (Pastel Pink Theme)

#### Primary Colors

- **Primary Pink**: `#FFB3C6` - Main buttons, headers, active states
- **Light Pink**: `#FFE5EC` - Backgrounds, cards
- **Dark Pink**: `#FF8BA7` - Hover states, emphasis

#### Supporting Colors

- **Pastel Mint**: `#B5EAD7` - Success states, positive balances
- **Pastel Peach**: `#FFD4B2` - Warnings, approaching limits
- **Pastel Lavender**: `#C7CEEA` - Debit card indicator
- **Pastel Yellow**: `#FFF4CC` - Credit card indicator

#### Neutral Colors

- **Off White**: `#FFFBF7` - Main background
- **Light Gray**: `#F5F5F5` - Secondary backgrounds
- **Medium Gray**: `#D4D4D4` - Borders, dividers
- **Charcoal**: `#4A4A4A` - Text

#### Status Colors

- **Success**: `#B5EAD7` (pastel mint)
- **Warning**: `#FFD4B2` (pastel peach)
- **Danger**: `#FFB3BA` (pastel red/coral)
- **Info**: `#B4D4FF` (pastel sky blue)

### Typography

- **Font Family**: Inter, Nunito, or similar rounded sans-serif
- **Headings**: 600 weight, charcoal color
- **Body Text**: 400 weight, charcoal color, 16px base
- **Small Text**: 14px for labels, 12px for captions

### Spacing & Layout

- **Base Unit**: 8px (spacing scale: 8, 16, 24, 32, 40, 48)
- **Container Max Width**: 1200px desktop, 100% mobile
- **Card Padding**: 24px
- **Border Radius**: 12px for cards, 8px for buttons, 20px for pills

## Dashboard Layout

### Top Section - At-a-Glance Summary

#### Current Period Header

- Display: Period dates (e.g., "01 Nov, 2025 - 30 Nov, 2025")
- Days remaining badge (e.g., "17 days left")
- Period dropdown to switch between periods

#### Balance Cards (Side by Side)

- **Debit Card**: Lavender background, large balance text, card icon
- **Credit Card**: Yellow background, available credit "€1,050 available", usage bar showing used amount

### Hero Section - Quick Action

#### Add Button (Floating Action Button)

- Large circular "+" button
- Primary pink background, white icon
- Position: Fixed/sticky bottom-right corner (24px from edges on mobile, 32px on desktop)
- Size: 64px diameter on mobile, 72px on desktop
- Shadow: Elevated shadow for depth

#### Expandable Menu (On Hover/Click)

- Floats upwards from the "+" button
- Three action buttons stacked vertically with 12px spacing:
  1. **"Expense"** - Most prominent, primary pink
  2. **"Income"** - Secondary style
  3. **"Pay off debt"** - Secondary style
- Each button: 48px height, rounded, with icon + label
- Appears with slide-up animation (200ms ease)
- On desktop: Expands on hover
- On mobile: Expands on tap, closes on tap outside or action selection
- Background overlay (semi-transparent) on mobile when expanded

### Main Content - Recent Activity

#### Today's Expenses Section

- Heading: "Recent Expenses"
- List of last 7 expenses
- Each item shows:
  - Expense name (bold)
  - Category badge (small, colored pill)
  - Amount (right-aligned, large)
  - Payment method icon (credit card or debit icon)
  - Date (if not today)
- Swipe left on mobile for delete action
- Click/tap to edit
- "View All Expenses" link at bottom

### Category Overview Cards

#### Spending by Category Grid

- 2x2 grid on desktop, single column on mobile
- Each card shows:
  - Category name and icon
  - Amount spent / Budget amount
  - Progress bar (color-coded)
  - Percentage used

**Categories to Display:**

1. Fixed Expenses
2. Debt Payments
3. Flexible Expenses
4. Sinking Funds

#### Individual Debts Tracking

- Separate section below category cards
- Each debt displayed as individual progress bar:
  - Debt name (e.g., "Student Loan", "Personal Loan")
  - Current balance / Original amount
  - Progress bar (color-coded: pastel mint for progress made, pastel peach for remaining)
  - Monthly payment amount
- Horizontal bars stacked vertically
- Shows total debt summary at top: "Total Debt: €X,XXX"

### Bottom Section - Additional Info

#### Income & Tracking Section

- Three info cards (horizontal on desktop, stacked on mobile):
  - **Next Payday**: Date + countdown or checkmark if paid
  - **Savings**: Total amount accumulated this period
  - **Investments**: Total amount accumulated this period

### Navigation

#### Desktop Navigation (Top Bar)

- Logo/App name (left)
- Navigation links: Dashboard | Expenses | Budget | Analytics | Settings
- User profile (right)

#### Mobile Navigation (Bottom Bar)

- 4 icons: Home | Expenses | Budget | Profile
- Floating action button ("+") positioned above center of nav bar
- Active state: Primary pink with icon fill
- Inactive state: Medium gray outline icons

## Key Pages & Components

### 1. Add/Edit Expense Modal

**Layout:**

- Modal overlay (semi-transparent dark)
- Centered card (max-width: 500px, mobile: full-width with top padding)
- Light pink background

**Form Fields (in order):**

1. **Expense Name**
   - Text input with autocomplete
   - Default: "Wolt"
   - Show recent expense names as suggestions
2. **Amount**
   - Large number input with € symbol
   - Primary focus field
   - Numeric keyboard on mobile
3. **Category**
   - Dropdown with icons
   - Default: "Flexible Expenses"
4. **Subcategory**
   - Dropdown (populated based on category)
   - Default: "Food"
   - Shows AI suggestion if available
5. **Date**
   - Date picker
   - Default: Current date
6. **Payment Method**
   - Toggle/checkbox: "Paid with Credit Card"
   - Default: Checked (credit card)
   - Visual: Card icons for debit/credit

**Actions:**

- Primary button: "Save" (primary pink, full-width on mobile)
- Secondary button: "Cancel" (text only, gray)
- Keyboard shortcut: Enter to save, Esc to cancel

### 2. Expenses List Page

**Filters Bar:**

- Date range picker
- Category filter (multi-select dropdown)
- Payment method filter (debit/credit/both)
- Search by name

**Expense List:**

- Grouped by date (collapsible sections)
- Each expense shows full details
- Actions: Edit, Delete
- Empty state: Illustration + "No expenses yet, add your first!"

**Summary Footer:**

- Total expenses
- Breakdown by payment method
- Export button (CSV download)

### 3. Budget Management Page

**Period Selector:**

- Current period highlighted
- Create new period button
- Archive/view past periods

**Budget Setup for Each Category:**

- Category name
- Budget amount input
- Toggle: "Enable budget limit for this category"
- Spent this period (read-only)

**Visual Progress:**

- Circular or linear progress for each category
- Color-coded based on usage percentage

### 4. End-of-Period Suggestions Modal

**Triggers:**

- Automatically appears when period ends with leftover balance
- Can be manually accessed from dashboard

**Display:**

- Heading: "You have €XXX remaining this period! 🎉"
- Subheading: "Here's what we recommend:"

**Suggestion Cards (stacked):**

1. **Pay Credit Card** (if balance exists)
   - Amount: Full credit card balance
   - Checkbox: Selected by default
2. **Extra Debt Payment** (if debt exists)
   - Amount: User can adjust
   - Checkbox: Selected by default
3. **Add to Savings**
   - Amount: Remaining after above
   - Checkbox: Optional

**Actions:**

- "Apply Suggestions" button (creates transactions)
- "Customize" button (adjust amounts)
- "Skip" link (dismiss without action)

### 5. Settings Page

**Sections:**

1. **Profile**: Name, email, password
2. **Default Values**: Configure expense defaults (name, category, payment method)
3. **Credit Card**: Set credit limit
4. **Budget Period**: Define period type and dates
5. **Salary Settings**: Amount, payment day
6. **Theme**: (Future) Light/dark mode toggle

## Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## Interactions & Animations

### Transitions

- Page transitions: 200ms ease
- Button hover: 150ms ease
- Modal open/close: 250ms ease with scale

### Hover States

- Buttons: Darker shade, slight scale (1.02)
- Cards: Subtle shadow increase
- List items: Light pink background

### Loading States

- Skeleton screens for data loading
- Spinner for actions (saving, deleting)
- Progress bar for bulk operations

### Feedback

- Success: Toast notification (mint background, 3s)
- Error: Toast notification (pastel coral, 5s with dismiss)
- Warning: Toast notification (peach background, 4s)

## Accessibility Requirements

- **Keyboard Navigation**: All interactive elements accessible via Tab
- **Focus Indicators**: 2px primary pink outline
- **Screen Readers**: Proper ARIA labels on all form fields and buttons
- **Color Contrast**: Ensure text meets WCAG AA standards (4.5:1 for body text)
- **Touch Targets**: Minimum 44x44px on mobile
- **Error Messages**: Clear, inline error messages for form validation

## Performance Goals

- **Initial Load**: < 2s on 3G connection
- **Time to Interactive**: < 3s
- **Image Optimization**: WebP format with fallbacks
- **Code Splitting**: Lazy load routes
- **Bundle Size**: < 200KB gzipped

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari iOS 13+
- Chrome Android (last 2 versions)

## Component Library Recommendation

- **Material-UI (MUI)**: Highly customizable, good mobile support
- **Ant Design**: Comprehensive component set
- **Custom Components**: Build from scratch with styled-components or Tailwind CSS

## State Management

- **React Context**: For simple global state (user, period)
- **React Query**: For server state (expenses, budgets)
- **Local Storage**: Persist user preferences

## API Integration Requirements

### Endpoints Needed

1. **Auth**: POST /login, POST /register, POST /logout
2. **Expenses**: GET /expenses, POST /expenses, PUT /expenses/:id, DELETE /expenses/:id
3. **Budget Periods**: GET /periods, POST /periods, GET /periods/:id
4. **Income**: GET /income, POST /income
5. **Suggestions**: GET /periods/:id/suggestions, POST /suggestions/apply
6. **Settings**: GET /settings, PUT /settings

### Request/Response Format

- JSON for all requests/responses
- Date format: "dd MMM, YYYY" (e.g., "12 Nov, 2025")
- Amounts in cents (integer) to avoid floating-point issues

## Testing Requirements

- **Unit Tests**: All components and utility functions
- **Integration Tests**: Critical user flows (add expense, view dashboard)
- **E2E Tests**: Complete user journeys (Cypress or Playwright)
- **Visual Regression**: Screenshot testing for UI consistency

## Deployment

- **Hosting**: Vercel, Netlify, or similar
- **Environment Variables**: API URL, feature flags
- **CDN**: For static assets
- **HTTPS**: Required for production

## Future Enhancements

### Phase 1 - Quick Wins (High Priority)

#### 1. Recurring Expenses Automation

- Set up recurring transactions (monthly bills, subscriptions)
- Auto-create on due date with notification for review
- Edit/pause/delete recurring items
- Categories: rent, subscriptions, insurance, debt payments
- UI: "Recurring" tab in settings with list of all recurring items

#### 2. Undo Toast Notification

- After delete: Toast appears with "Expense deleted" + "Undo" button
- 5-second window to restore
- Prevents accidental deletions
- Toast slides in from bottom, pastel coral background

#### 3. Expense Duplication

- "Duplicate" button on each expense (list and detail view)
- Copies all fields, opens edit modal
- User adjusts amount or date, saves
- Common use case: same restaurant, different amount

#### 4. Progressive Web App (PWA)

- Installable on mobile home screen
- Offline capability with service worker
- App-like experience without app store
- Manifest.json with icons and theme colors

#### 5. Quick Dashboard Filters

- Filter buttons above dashboard cards:
  - "This Week" | "This Month" | "All Time"
  - "All Cards" | "Debit Only" | "Credit Only"
- Highlight active filter (primary pink background)
- Persist selection in local storage

### Phase 2 - UX Enhancements

#### 6. Budget Period Templates

- Save current budget setup as template
- Quick-start new period with pre-filled categories and amounts
- Template library with edit/delete options
- UI: "Templates" section in budget settings

#### 7. Expense Receipts & Notes

- Optional photo upload for receipts
- Notes field (textarea, 200 char limit)
- Display thumbnail in expense list
- Click to view full-size receipt
- Store images in cloud storage (S3/CloudFlare)

#### 8. Spending Insights Widget

- Dashboard card showing:
  - "This week vs last week" comparison with % change
  - "Most expensive day this period" highlight
  - "Trending up/down" per category with arrow indicators
- Visual: Small line charts or sparklines
- Color-coded: green (down), red (up)

#### 9. Keyboard Shortcuts

- Global shortcuts:
  - "/" - Focus search
  - "N" or "E" - New expense
  - "I" - New income
  - "Esc" - Close modal
- Display shortcut hints in UI (subtle gray text)
- "?" key shows all shortcuts overlay

#### 10. Offline Support

- Service worker caches app shell and recent data
- Queue actions when offline (IndexedDB)
- Sync when connection restored
- Offline indicator banner (yellow)
- "You're offline" toast with queued actions count

### Phase 3 - Advanced Features

#### 11. Voice Input

- Speech-to-text for expense entry
- Command: "Add €15 Wolt" → Creates expense with defaults
- Works on Chrome/Safari with Web Speech API
- Microphone button in add expense modal
- Confirmation before saving

#### 12. Data Export & Import

- Export formats: JSON (full backup), CSV (for Excel)
- Import from CSV for bulk adding
- "Export All Data" button in settings
- Download includes: expenses, income, budgets, periods
- Import validates data format and shows preview

#### 13. Budget Sharing (Multi-User)

- Invite partner/family member via email
- Shared budget view with permissions
- Each user can add/edit expenses
- Activity log: "John added €50 expense"
- Requires authentication & role-based access

#### 14. Streak Tracking

- Track consecutive days/weeks staying under budget
- Visual indicator: Flame icon with number
- Display on dashboard: "🔥 12 days under budget!"
- Reset on over-budget day
- Motivational, celebratory tone

#### 15. Financial Milestones

- Automatic milestone detection:
  - "First €1,000 saved! 🎉"
  - "Credit card paid off 3 months in a row! 💪"
  - "50th expense tracked! 🎊"
- Toast notification with confetti animation
- Milestone history page

#### 16. Dark Mode

- Pastel dark theme with muted colors:
  - Background: `#1A1A1F` (deep navy)
  - Primary: `#C77D8E` (muted pink)
  - Cards: `#2D2D35` (dark gray)
  - Text: `#E8E8E8` (off-white)
- Auto-switch based on system preference
- Manual toggle in settings
- Save preference per user

#### 17. Multi-Currency Support

- Add expenses in different currencies when traveling
- Auto-conversion to base currency (€)
- Exchange rates updated daily (API integration)
- Display original currency + converted amount
- Settings: Select base currency

### Phase 4 - Analytics & Insights

#### 18. Spending Analytics Page

- Charts and visualizations:
  - Pie chart: Spending by category
  - Line chart: Daily spending trend
  - Bar chart: Month-over-month comparison
- Date range selector
- Export charts as PNG

#### 19. Budget Goals

- Set savings goals with target amounts and dates
- Progress tracking with visual bars
- Suggestions for reaching goals
- Goal categories: Emergency fund, vacation, purchase

#### 20. Expense Tags

- Custom tags for expenses (e.g., "work-related", "gift")
- Filter and search by tags
- Tag suggestions based on expense name
- Multi-tag support

### Technical Enhancements

#### 21. Performance Optimizations

- Lazy loading for expense list (infinite scroll)
- Image lazy loading for receipts
- Code splitting by route
- Memoization for expensive calculations

#### 22. Enhanced Security

- Two-factor authentication (2FA)
- Session timeout after inactivity
- Encrypted data at rest
- Audit log for sensitive actions

#### 23. Notifications

- Push notifications for:
  - Upcoming bills (3 days before)
  - Budget limit warnings (80% spent)
  - End-of-period summary
- Email digests (weekly/monthly)
- Customizable in settings

#### 24. Mobile Native App

- React Native version for iOS/Android
- Native features: biometric auth, haptic feedback
- Offline-first architecture
- App store distribution
