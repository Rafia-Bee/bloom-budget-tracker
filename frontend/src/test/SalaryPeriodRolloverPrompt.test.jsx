/**
 * SalaryPeriodRolloverPrompt Test Suite
 *
 * Tests the rollover prompt banner that appears at end of salary periods.
 * Verifies loading states, messages, and rollover actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SalaryPeriodRolloverPrompt from '../components/SalaryPeriodRolloverPrompt'

// Mock the API
vi.mock('../api', () => ({
  salaryPeriodAPI: {
    getCurrent: vi.fn()
  }
}))

import { salaryPeriodAPI } from '../api'

describe('SalaryPeriodRolloverPrompt', () => {
  let mockOnCreateNext
  let mockOnDismiss

  beforeEach(() => {
    mockOnCreateNext = vi.fn()
    mockOnDismiss = vi.fn()
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders nothing while loading', () => {
      salaryPeriodAPI.getCurrent.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { container } = render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Error State', () => {
    it('renders nothing when API fails', async () => {
      salaryPeriodAPI.getCurrent.mockRejectedValue(new Error('Network error'))

      const { container } = render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('renders nothing when no salary period found', async () => {
      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: { salary_period: null }
      })

      const { container } = render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Ending Soon Banner (Yellow)', () => {
    beforeEach(() => {
      // Period ending in 3 days
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: futureDate.toISOString().split('T')[0],
            display_debit_balance: 75000,
            display_credit_available: 120000,
            credit_limit: 150000,
            credit_budget_allowance: 5000
          }
        }
      })
    })

    it('renders the banner with ending soon message', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 4 Ending Soon')).toBeInTheDocument()
      })
    })

    it('shows days remaining in message', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/ends in \d+ day/i)).toBeInTheDocument()
      })
    })

    it('displays suggested debit balance', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/€750\.00/)).toBeInTheDocument()
      })
    })

    it('displays suggested credit available and limit', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/€1200\.00/)).toBeInTheDocument()
        expect(screen.getByText(/€1500\.00/)).toBeInTheDocument()
      })
    })

    it('has yellow background for ending soon', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        const banner = document.querySelector('.rounded-xl')
        expect(banner).toHaveClass('bg-yellow-50')
      })
    })

    it('shows Create Next Period button', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Create Next Period')).toBeInTheDocument()
      })
    })

    it('shows Remind Me Later button', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Remind Me Later')).toBeInTheDocument()
      })
    })
  })

  describe('Overdue Banner (Red)', () => {
    beforeEach(() => {
      // Period ended 2 days ago
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 2)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: pastDate.toISOString().split('T')[0],
            display_debit_balance: 50000,
            display_credit_available: 100000,
            credit_limit: 150000,
            credit_budget_allowance: 0
          }
        }
      })
    })

    it('renders the banner with overdue message', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Salary Period Ended')).toBeInTheDocument()
      })
    })

    it('shows how many days ago period ended', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/ended \d+ days? ago/i)).toBeInTheDocument()
      })
    })

    it('has red background for overdue', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        const banner = document.querySelector('.rounded-xl')
        expect(banner).toHaveClass('bg-red-50')
      })
    })

    it('has red border for overdue', async () => {
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        const banner = document.querySelector('.rounded-xl')
        expect(banner).toHaveClass('border-red-300')
      })
    })
  })

  describe('User Actions', () => {
    beforeEach(() => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: futureDate.toISOString().split('T')[0],
            display_debit_balance: 80000,
            display_credit_available: 130000,
            credit_limit: 150000,
            credit_budget_allowance: 10000
          }
        }
      })
    })

    it('calls onCreateNext with rollover data when Create Next Period clicked', async () => {
      const user = userEvent.setup()
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Create Next Period')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create Next Period'))

      expect(mockOnCreateNext).toHaveBeenCalledTimes(1)
      expect(mockOnCreateNext).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedDebitBalance: 80000,
          suggestedCreditAvailable: 130000,
          creditLimit: 150000
        })
      )
    })

    it('calls onDismiss when Remind Me Later clicked', async () => {
      const user = userEvent.setup()
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Remind Me Later')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Remind Me Later'))

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })

    it('calls onDismiss when X button clicked', async () => {
      const user = userEvent.setup()
      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Create Next Period')).toBeInTheDocument()
      })

      const closeButton = screen.getByLabelText('Close')
      await user.click(closeButton)

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Balance Display', () => {
    it('formats balances from cents to euros', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: futureDate.toISOString().split('T')[0],
            display_debit_balance: 123456,
            display_credit_available: 98765,
            credit_limit: 200000,
            credit_budget_allowance: 5000
          }
        }
      })

      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/€1234\.56/)).toBeInTheDocument()
        expect(screen.getByText(/€987\.65/)).toBeInTheDocument()
        expect(screen.getByText(/€2000\.00/)).toBeInTheDocument()
      })
    })

    it('shows balance labels', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: futureDate.toISOString().split('T')[0],
            display_debit_balance: 50000,
            display_credit_available: 100000,
            credit_limit: 150000,
            credit_budget_allowance: 0
          }
        }
      })

      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/debit:/i)).toBeInTheDocument()
        expect(screen.getByText(/credit available:/i)).toBeInTheDocument()
      })
    })
  })

  describe('Icon Display', () => {
    it('shows warning icon', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: futureDate.toISOString().split('T')[0],
            display_debit_balance: 50000,
            display_credit_available: 100000,
            credit_limit: 150000,
            credit_budget_allowance: 0
          }
        }
      })

      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        const svg = document.querySelector('svg.w-6.h-6')
        expect(svg).toBeInTheDocument()
      })
    })
  })

  describe('Margin and Layout', () => {
    it('has bottom margin for spacing', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      salaryPeriodAPI.getCurrent.mockResolvedValue({
        data: {
          salary_period: {
            id: 1,
            start_date: '2025-12-01',
            end_date: futureDate.toISOString().split('T')[0],
            display_debit_balance: 50000,
            display_credit_available: 100000,
            credit_limit: 150000,
            credit_budget_allowance: 0
          }
        }
      })

      render(
        <SalaryPeriodRolloverPrompt
          onCreateNext={mockOnCreateNext}
          onDismiss={mockOnDismiss}
        />
      )

      await waitFor(() => {
        const banner = screen.getByText('Week 4 Ending Soon').closest('.rounded-xl')
        expect(banner).toHaveClass('mb-6')
      })
    })
  })
})
