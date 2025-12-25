/**
 * Header Test Suite
 *
 * Tests for the Header component covering:
 * - Navigation links rendering
 * - User menu interactions
 * - Mobile menu toggle
 * - Logout functionality
 * - Export/Import menu options
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Header from '../components/Header'
import { FeatureFlagProvider } from '../contexts/FeatureFlagContext'

// Mock the API
vi.mock('../api', () => ({
  authAPI: {
    logout: vi.fn(() => Promise.resolve())
  }
}))

// Mock ThemeToggle to simplify tests
vi.mock('../components/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle">Theme Toggle</div>
}))

// Wrapper component with required providers
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <FeatureFlagProvider>
      {children}
    </FeatureFlagProvider>
  </BrowserRouter>
)

describe('Header', () => {
  const mockSetIsAuthenticated = vi.fn()
  const mockOnExport = vi.fn()
  const mockOnImport = vi.fn()
  const mockOnBankImport = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up localStorage with user email
    localStorage.setItem('user_email', 'test@example.com')
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  const renderHeader = (props = {}) => {
    return render(
      <TestWrapper>
        <Header
          setIsAuthenticated={mockSetIsAuthenticated}
          onExport={mockOnExport}
          onImport={mockOnImport}
          onBankImport={mockOnBankImport}
          {...props}
        />
      </TestWrapper>
    )
  }

  describe('Rendering', () => {
    it('renders the logo/brand', () => {
      renderHeader()

      // Look for "Bloom" heading text in the header (there may be multiple)
      const bloomElements = screen.getAllByText('Bloom')
      expect(bloomElements.length).toBeGreaterThan(0)
    })

    it('renders desktop navigation links', () => {
      renderHeader()

      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Goals' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Recurring' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Debts' })).toBeInTheDocument()
    })

    it('renders user menu button with first letter of email', () => {
      renderHeader()

      // The user menu button should show 'T' for test@example.com
      const userButton = screen.getByTitle('User menu')
      expect(userButton).toHaveTextContent('T')
    })

    it('renders mobile menu button on mobile', () => {
      renderHeader()

      // Mobile menu hamburger button with aria-label="Menu"
      const mobileMenuButton = screen.getByRole('button', { name: 'Menu' })
      expect(mobileMenuButton).toBeInTheDocument()
    })
  })

  describe('User Menu', () => {
    it('opens user menu when clicked', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      // User menu should show email
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('shows theme toggle in user menu', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    })

    it('shows Settings option in user menu', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('shows Logout option in user menu', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('shows Import/Export submenu option', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      expect(screen.getByText('Import/Export')).toBeInTheDocument()
    })

    it('closes user menu when clicking outside', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()

      // Click outside the menu
      await user.click(document.body)

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByText('Signed in as')).not.toBeInTheDocument()
      })
    })
  })

  describe('Import/Export Submenu', () => {
    it('expands Import/Export submenu when clicked', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      const importExportButton = screen.getByText('Import/Export')
      await user.click(importExportButton)

      expect(screen.getByText('Export Financial Data')).toBeInTheDocument()
      expect(screen.getByText('Import Financial Data')).toBeInTheDocument()
      expect(screen.getByText('Import Bank Transactions')).toBeInTheDocument()
    })

    it('calls onExport when Export is clicked', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      const importExportButton = screen.getByText('Import/Export')
      await user.click(importExportButton)

      await user.click(screen.getByText('Export Financial Data'))

      expect(mockOnExport).toHaveBeenCalledTimes(1)
    })

    it('calls onImport when Import is clicked', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      const importExportButton = screen.getByText('Import/Export')
      await user.click(importExportButton)

      await user.click(screen.getByText('Import Financial Data'))

      expect(mockOnImport).toHaveBeenCalledTimes(1)
    })

    it('calls onBankImport when Bank Import is clicked', async () => {
      const user = userEvent.setup()
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      const importExportButton = screen.getByText('Import/Export')
      await user.click(importExportButton)

      await user.click(screen.getByText('Import Bank Transactions'))

      expect(mockOnBankImport).toHaveBeenCalledTimes(1)
    })
  })

  describe('Logout', () => {
    it('calls logout and setIsAuthenticated on logout', async () => {
      const user = userEvent.setup()
      const { authAPI } = await import('../api')

      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      await user.click(screen.getByText('Logout'))

      await waitFor(() => {
        expect(authAPI.logout).toHaveBeenCalled()
        expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false)
      })
    })

    it('removes user_email from localStorage on logout', async () => {
      const user = userEvent.setup()

      renderHeader()

      const userButton = screen.getByTitle('User menu')
      await user.click(userButton)

      await user.click(screen.getByText('Logout'))

      await waitFor(() => {
        expect(localStorage.getItem('user_email')).toBeNull()
      })
    })
  })

  describe('Mobile Menu', () => {
    it('opens mobile menu when hamburger is clicked', async () => {
      const user = userEvent.setup()
      renderHeader()

      const mobileMenuButton = screen.getByRole('button', { name: 'Menu' })
      await user.click(mobileMenuButton)

      // Mobile menu should show navigation options with emojis
      expect(screen.getByText(/🏠 Dashboard/)).toBeInTheDocument()
    })

    it('shows navigation items in mobile menu', async () => {
      const user = userEvent.setup()
      renderHeader()

      const mobileMenuButton = screen.getByRole('button', { name: 'Menu' })
      await user.click(mobileMenuButton)

      expect(screen.getByText(/🎯 Goals/)).toBeInTheDocument()
      expect(screen.getByText(/🔄 Recurring Expenses/)).toBeInTheDocument()
      expect(screen.getByText(/💳 Debts/)).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('Dashboard link has correct href', () => {
      renderHeader()

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    })

    it('Goals link has correct href', () => {
      renderHeader()

      const goalsLink = screen.getByRole('link', { name: 'Goals' })
      expect(goalsLink).toHaveAttribute('href', '/goals')
    })

    it('Recurring link has correct href', () => {
      renderHeader()

      const recurringLink = screen.getByRole('link', { name: 'Recurring' })
      expect(recurringLink).toHaveAttribute('href', '/recurring-expenses')
    })

    it('Debts link has correct href', () => {
      renderHeader()

      const debtsLink = screen.getByRole('link', { name: 'Debts' })
      expect(debtsLink).toHaveAttribute('href', '/debts')
    })
  })

  describe('User Initial Display', () => {
    it('shows "U" when no email in localStorage', () => {
      localStorage.removeItem('user_email')
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      expect(userButton).toHaveTextContent('U')
    })

    it('shows first letter uppercase for any email', () => {
      localStorage.setItem('user_email', 'john@example.com')
      renderHeader()

      const userButton = screen.getByTitle('User menu')
      expect(userButton).toHaveTextContent('J')
    })
  })
})
