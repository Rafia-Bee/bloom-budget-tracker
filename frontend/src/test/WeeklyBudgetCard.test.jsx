/**
 * Bloom - WeeklyBudgetCard Component Tests
 *
 * Tests for weekly budget display including:
 * - Loading states
 * - No period setup state
 * - Error states
 * - Budget display with progress bar
 * - Week navigation
 * - Carryover display
 * - Allocate leftover button
 * - Progress color thresholds
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import WeeklyBudgetCard from '../components/WeeklyBudgetCard'
import api from '../api'

describe('WeeklyBudgetCard', () => {
  const mockOnSetupClick = vi.fn()
  const mockOnAllocateClick = vi.fn()
  const mockOnWeekChange = vi.fn()

  // Standard weekly data response
  const mockWeeklyData = {
    salary_period: {
      id: 1,
      start_date: '2025-12-24',
      end_date: '2026-01-20',
      weeks: [
        {
          week_number: 1,
          start_date: '2025-12-24',
          end_date: '2025-12-30',
          budget_amount: 37500, // €375.00
          adjusted_budget: 37500,
          spent: 15000, // €150.00
          remaining: 22500, // €225.00
          carryover: 0
        },
        {
          week_number: 2,
          start_date: '2025-12-31',
          end_date: '2026-01-06',
          budget_amount: 37500,
          adjusted_budget: 37500,
          spent: 0,
          remaining: 37500,
          carryover: 0
        },
        {
          week_number: 3,
          start_date: '2026-01-07',
          end_date: '2026-01-13',
          budget_amount: 37500,
          adjusted_budget: 37500,
          spent: 0,
          remaining: 37500,
          carryover: 0
        },
        {
          week_number: 4,
          start_date: '2026-01-14',
          end_date: '2026-01-20',
          budget_amount: 37500,
          adjusted_budget: 37500,
          spent: 0,
          remaining: 37500,
          carryover: 0
        }
      ]
    },
    current_week: {
      week_number: 1,
      start_date: '2025-12-24',
      end_date: '2025-12-30',
      budget_amount: 37500,
      adjusted_budget: 37500,
      spent: 15000,
      remaining: 22500,
      carryover: 0
    }
  }

  beforeEach(() => {
    mockOnSetupClick.mockClear()
    mockOnAllocateClick.mockClear()
    mockOnWeekChange.mockClear()
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading skeleton initially', async () => {
      // Make API hang to see loading state
      api.get.mockImplementation(() => new Promise(() => {}))

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      // Should show loading skeleton (animate-pulse class)
      const loadingElement = document.querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })
  })

  describe('No Period State', () => {
    beforeEach(() => {
      api.get.mockRejectedValue({ response: { status: 404 } })
    })

    it('shows setup prompt when no salary period exists', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Set Up Weekly Budget')).toBeInTheDocument()
      })
    })

    it('shows descriptive text about weekly budgets', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/divide your salary into 4 weekly budgets/i)).toBeInTheDocument()
      })
    })

    it('shows Get Started button', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
      })
    })

    it('calls onSetupClick when Get Started is clicked', async () => {
      const user = userEvent.setup()

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /get started/i }))

      expect(mockOnSetupClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error State', () => {
    it('shows error message when API fails (non-404)', async () => {
      api.get.mockRejectedValue({ response: { status: 500 } })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load weekly budget/i)).toBeInTheDocument()
      })
    })
  })

  describe('Budget Display', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: mockWeeklyData })
    })

    it('displays current week number', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 1 of 4')).toBeInTheDocument()
      })
    })

    it('displays "Current" badge for current week', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument()
      })
    })

    it('displays base budget amount', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Base Budget')).toBeInTheDocument()
      })
      // €375.00 = 37500 cents
      expect(screen.getByText('€375.00')).toBeInTheDocument()
    })

    it('displays spent amount', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Spent')).toBeInTheDocument()
      })
      // €150.00 = 15000 cents
      expect(screen.getByText('€150.00')).toBeInTheDocument()
    })

    it('displays remaining amount', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Remaining')).toBeInTheDocument()
      })
      // €225.00 = 22500 cents
      expect(screen.getByText('€225.00')).toBeInTheDocument()
    })

    it('displays week date range', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      // Date format is "24 Dec, 2025 - 30 Dec, 2025"
      await waitFor(() => {
        expect(screen.getByText(/24 Dec, 2025/)).toBeInTheDocument()
      })
    })
  })

  describe('Progress Bar', () => {
    it('shows green progress bar under 75%', async () => {
      // 15000/37500 = 40% (under 75%)
      api.get.mockResolvedValue({ data: mockWeeklyData })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-bloom-mint')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('shows yellow progress bar at 75-89%', async () => {
      const highSpendData = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          spent: 30000, // 80% of 37500
          remaining: 7500
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, spent: 30000, remaining: 7500 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: highSpendData })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-yellow-500')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('shows red progress bar at 90%+', async () => {
      const veryHighSpendData = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          spent: 35000, // ~93% of 37500
          remaining: 2500
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, spent: 35000, remaining: 2500 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: veryHighSpendData })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-red-500')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('shows warning message at 90%+ spending', async () => {
      const veryHighSpendData = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          spent: 35000,
          remaining: 2500
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, spent: 35000, remaining: 2500 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: veryHighSpendData })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/you've spent 93% of your weekly budget/i)).toBeInTheDocument()
      })
    })
  })

  describe('Week Navigation', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: mockWeeklyData })
    })

    it('shows week dropdown when multiple weeks exist', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })
    })

    it('dropdown has options for all 4 weeks', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(4)
    })

    it('calls onWeekChange when week is changed', async () => {
      const user = userEvent.setup()

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByRole('combobox'), '2')

      expect(mockOnWeekChange).toHaveBeenCalledWith(expect.objectContaining({
        week_number: 2
      }))
    })

    it('updates display when week changes', async () => {
      const user = userEvent.setup()

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 1 of 4')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByRole('combobox'), '2')

      await waitFor(() => {
        expect(screen.getByText('Week 2 of 4')).toBeInTheDocument()
      })
    })

    it('does not show "Current" badge for non-current week', async () => {
      const user = userEvent.setup()

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByRole('combobox'), '2')

      await waitFor(() => {
        expect(screen.queryByText('Current')).not.toBeInTheDocument()
      })
    })
  })

  describe('Carryover Display', () => {
    it('shows negative carryover with warning', async () => {
      const dataWithNegativeCarryover = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          carryover: -5000 // €50.00 overspent
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, carryover: -5000 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: dataWithNegativeCarryover })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/overspent from previous weeks/i)).toBeInTheDocument()
      })
      expect(screen.getByText('€50.00')).toBeInTheDocument()
    })

    it('shows positive carryover with sparkle', async () => {
      const dataWithPositiveCarryover = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          carryover: 10000 // €100.00 leftover
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, carryover: 10000 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: dataWithPositiveCarryover })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/leftover from previous weeks/i)).toBeInTheDocument()
      })
      expect(screen.getByText('€100.00')).toBeInTheDocument()
    })

    it('does not show carryover section when carryover is 0', async () => {
      api.get.mockResolvedValue({ data: mockWeeklyData })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 1 of 4')).toBeInTheDocument()
      })

      expect(screen.queryByText(/overspent from previous weeks/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/leftover from previous weeks/i)).not.toBeInTheDocument()
    })
  })

  describe('Adjusted Budget', () => {
    it('shows adjusted budget when different from base budget', async () => {
      const dataWithAdjustedBudget = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          budget_amount: 37500,
          adjusted_budget: 32500 // €325.00 after carryover
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, budget_amount: 37500, adjusted_budget: 32500 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: dataWithAdjustedBudget })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Adjusted Budget')).toBeInTheDocument()
      })
      expect(screen.getByText('€325.00')).toBeInTheDocument()
    })
  })

  describe('Allocate Leftover Button', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: mockWeeklyData })
    })

    it('shows allocate button when remaining > 0', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /allocate leftover/i })).toBeInTheDocument()
      })
    })

    it('shows remaining amount in button text', async () => {
      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        // The button contains the remaining amount
        const button = screen.getByRole('button', { name: /allocate leftover/i })
        expect(button.textContent).toContain('225.00')
      })
    })

    it('calls onAllocateClick with period ID and week number', async () => {
      const user = userEvent.setup()

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /allocate leftover/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /allocate leftover/i }))

      expect(mockOnAllocateClick).toHaveBeenCalledWith(1, 1) // period ID = 1, week = 1
    })

    it('does not show allocate button when remaining is 0', async () => {
      const dataWithNoRemaining = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          spent: 37500,
          remaining: 0
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, spent: 37500, remaining: 0 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: dataWithNoRemaining })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 1 of 4')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /allocate leftover/i })).not.toBeInTheDocument()
    })
  })

  describe('Settings Button', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: mockWeeklyData })
    })

    it('calls onSetupClick when settings button clicked', async () => {
      const user = userEvent.setup()

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByTitle('Manage salary period')).toBeInTheDocument()
      })

      await user.click(screen.getByTitle('Manage salary period'))

      expect(mockOnSetupClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Ref Methods', () => {
    beforeEach(() => {
      api.get.mockResolvedValue({ data: mockWeeklyData })
    })

    it('exposes refresh method via ref', async () => {
      const ref = createRef()

      render(
        <WeeklyBudgetCard
          ref={ref}
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 1 of 4')).toBeInTheDocument()
      })

      expect(ref.current.refresh).toBeDefined()
      expect(typeof ref.current.refresh).toBe('function')
    })

    it('refresh method reloads data', async () => {
      const ref = createRef()

      render(
        <WeeklyBudgetCard
          ref={ref}
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Week 1 of 4')).toBeInTheDocument()
      })

      // API was called once on mount
      expect(api.get).toHaveBeenCalledTimes(1)

      // Call refresh
      await ref.current.refresh()

      // API should be called again
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Negative Remaining', () => {
    it('shows red text for negative remaining amount', async () => {
      const dataWithNegativeRemaining = {
        ...mockWeeklyData,
        current_week: {
          ...mockWeeklyData.current_week,
          spent: 40000, // Over budget
          remaining: -2500 // -€25.00
        },
        salary_period: {
          ...mockWeeklyData.salary_period,
          weeks: mockWeeklyData.salary_period.weeks.map(w =>
            w.week_number === 1 ? { ...w, spent: 40000, remaining: -2500 } : w
          )
        }
      }
      api.get.mockResolvedValue({ data: dataWithNegativeRemaining })

      render(
        <WeeklyBudgetCard
          onSetupClick={mockOnSetupClick}
          onAllocateClick={mockOnAllocateClick}
          onWeekChange={mockOnWeekChange}
        />
      )

      await waitFor(() => {
        const remainingElement = screen.getByText('€-25.00')
        expect(remainingElement).toHaveClass('text-red-200')
      })
    })
  })
})
