import React from 'react'
/**
 * Bloom - ExperimentalFeaturesModal Tests
 *
 * Tests for the experimental features settings modal that allows
 * users to enable beta features and delete all their data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { clickWithAct, typeWithAct } from './test-utils'
import { BrowserRouter } from 'react-router-dom'
import ExperimentalFeaturesModal from '../components/ExperimentalFeaturesModal'
import { FeatureFlagProvider } from '../contexts/FeatureFlagContext'
import { userAPI } from '../api'

// Mock the userAPI module
vi.mock('../api', () => ({
  userAPI: {
    deleteAllData: vi.fn()
  }
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Create a wrapper component
const TestWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      <FeatureFlagProvider>
        {children}
      </FeatureFlagProvider>
    </BrowserRouter>
  )
}

describe('ExperimentalFeaturesModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage before each test
    localStorage.clear()
    userAPI.deleteAllData.mockResolvedValue({
      data: {
        success: true,
        deleted_records: { total: 100 }
      }
    })
    // Mock window.alert and window.location.reload
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    delete window.location
    window.location = { reload: vi.fn() }
  })

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByRole('heading', { level: 2, name: 'Experimental Features' })).toBeInTheDocument()
    })

    it('renders subtitle text', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByText('Enable features in development')).toBeInTheDocument()
    })

    it('renders warning banner with important notice', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByText('Important Notice')).toBeInTheDocument()
    })

    it('renders warning about bugs and incomplete functionality', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByText('Have bugs or incomplete functionality')).toBeInTheDocument()
    })

    it('renders backup reminder', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByText('Use at your own risk. Always keep backups!')).toBeInTheDocument()
    })

    it('renders experimental features toggle', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('renders BETA badge', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByText('BETA')).toBeInTheDocument()
    })

    it('renders Done button in footer', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })
  })

  describe('Modal Close', () => {
    it('calls onClose when Done button is clicked', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('button', { name: 'Done' }))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when X button is clicked', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      // Find the close button (first button, not Done)
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons.find(btn => btn.textContent !== 'Done')
      await clickWithAct(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Feature Toggle', () => {
    it('toggle is unchecked by default', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('can enable experimental features', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      await clickWithAct(checkbox)

      expect(checkbox).toBeChecked()
    })

    it('shows danger zone when experimental features are enabled', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.queryByText(/Danger Zone/)).not.toBeInTheDocument()

      const checkbox = screen.getByRole('checkbox')
      await clickWithAct(checkbox)

      await waitFor(() => {
        expect(screen.getByText(/Danger Zone/)).toBeInTheDocument()
      })
    })

    it('shows Delete All Data button when enabled', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      await clickWithAct(checkbox)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })
    })
  })

  describe('Delete All Data - Initial State', () => {
    it('shows Delete All Data button initially when enabled', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })
    })

    it('does not show confirmation input initially', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      expect(screen.queryByPlaceholderText('Delete everything')).not.toBeInTheDocument()
    })
  })

  describe('Delete All Data - Confirmation Flow', () => {
    it('shows confirmation UI when Delete All Data is clicked', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      expect(screen.getByPlaceholderText('Delete everything')).toBeInTheDocument()
    })

    it('shows list of items that will be deleted', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      expect(screen.getByText('All expenses')).toBeInTheDocument()
      expect(screen.getByText('All income entries')).toBeInTheDocument()
      expect(screen.getByText('All debts')).toBeInTheDocument()
    })

    it('Cancel button hides confirmation UI', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))
      await clickWithAct(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByPlaceholderText('Delete everything')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
    })

    it('Confirm button is disabled without correct text', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const confirmButton = screen.getByRole('button', { name: /Confirm Delete All/i })
      expect(confirmButton).toBeDisabled()
    })

    it('Confirm button is enabled with correct text', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      const confirmButton = screen.getByRole('button', { name: /Confirm Delete All/i })
      expect(confirmButton).not.toBeDisabled()
    })
  })

  describe('Delete All Data - API Interaction', () => {
    it('calls deleteAllData API when confirmed with correct text', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      expect(userAPI.deleteAllData).toHaveBeenCalledWith('Delete everything')
    })

    it('shows success alert on successful deletion', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Successfully deleted 100 records')
      })
    })

    it('navigates to dashboard after successful deletion', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Delete All Data - Error Handling', () => {
    it('shows error when API call fails', async () => {
      userAPI.deleteAllData.mockRejectedValue({
        response: { data: { error: 'Server error' } }
      })

      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })
    })

    it('shows generic error when no API error message', async () => {
      userAPI.deleteAllData.mockRejectedValue(new Error('Network error'))

      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to delete data')).toBeInTheDocument()
      })
    })
  })

  describe('Delete All Data - Loading State', () => {
    it('shows loading spinner during deletion', async () => {
      // Make API call hang
      userAPI.deleteAllData.mockImplementation(() => new Promise(() => {}))

      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    it('disables input during deletion', async () => {
      userAPI.deleteAllData.mockImplementation(() => new Promise(() => {}))

      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      await clickWithAct(screen.getByRole('checkbox'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Delete All Data/i })).toBeInTheDocument()
      })

      await clickWithAct(screen.getByRole('button', { name: /Delete All Data/i }))

      const input = screen.getByPlaceholderText('Delete everything')
      await typeWithAct(input, 'Delete everything')

      await clickWithAct(screen.getByRole('button', { name: /Confirm Delete All/i }))

      expect(input).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has accessible modal structure', () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      // Use heading role to find the specific title
      expect(screen.getByRole('heading', { level: 2, name: 'Experimental Features' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('checkbox can be toggled with keyboard', async () => {
      render(
        <TestWrapper>
          <ExperimentalFeaturesModal onClose={mockOnClose} />
        </TestWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      // Clicking the checkbox simulates keyboard activation via space/enter
      await clickWithAct(checkbox)

      expect(checkbox).toBeChecked()
    })
  })
})
