/**
 * OfflineIndicator Test Suite
 *
 * Tests the offline/online status banner component.
 * Verifies banner display, sync messages, and event handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import OfflineIndicator from '../components/OfflineIndicator'

describe('OfflineIndicator', () => {
  let originalNavigatorOnline

  beforeEach(() => {
    // Save original navigator.onLine
    originalNavigatorOnline = navigator.onLine
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalNavigatorOnline
    })
    vi.useRealTimers()
  })

  describe('Online State', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
    })

    it('renders nothing when online and no recent reconnection', () => {
      const { container } = render(<OfflineIndicator />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Offline State', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
    })

    it('renders offline banner when offline', () => {
      render(<OfflineIndicator />)

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    })

    it('shows offline message about syncing when online', () => {
      render(<OfflineIndicator />)

      expect(screen.getByText(/changes will sync when online/i)).toBeInTheDocument()
    })

    it('has orange background when offline', () => {
      render(<OfflineIndicator />)

      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('bg-orange-300')
    })

    it('renders wifi-off icon when offline', () => {
      render(<OfflineIndicator />)

      const banner = document.querySelector('.fixed')
      const svg = banner.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('w-5')
      expect(svg).toHaveClass('h-5')
    })

    it('is fixed to top of screen', () => {
      render(<OfflineIndicator />)

      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('fixed')
      expect(banner).toHaveClass('top-0')
      expect(banner).toHaveClass('left-0')
      expect(banner).toHaveClass('right-0')
    })

    it('has high z-index for visibility', () => {
      render(<OfflineIndicator />)

      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('z-50')
    })
  })

  describe('Online Event Handler', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
    })

    it('shows sync message when coming back online', async () => {
      render(<OfflineIndicator />)

      // Verify offline first
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument()

      // Simulate coming online
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      expect(screen.getByText(/back online/i)).toBeInTheDocument()
      expect(screen.getByText(/syncing data/i)).toBeInTheDocument()
    })

    it('has green background when showing sync message', async () => {
      render(<OfflineIndicator />)

      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('bg-emerald-600')
    })

    it('hides sync message after 3 seconds', async () => {
      render(<OfflineIndicator />)

      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      expect(screen.getByText(/back online/i)).toBeInTheDocument()

      // Fast-forward 3 seconds
      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.queryByText(/back online/i)).not.toBeInTheDocument()
    })

    it('renders checkmark icon when back online', async () => {
      render(<OfflineIndicator />)

      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      const banner = document.querySelector('.fixed')
      const svg = banner.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Offline Event Handler', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
    })

    it('shows offline banner when going offline', async () => {
      const { container } = render(<OfflineIndicator />)

      // Initially nothing rendered
      expect(container.firstChild).toBeNull()

      // Simulate going offline
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    })

    it('hides sync message when going offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(<OfflineIndicator />)

      // Come online
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      expect(screen.getByText(/back online/i)).toBeInTheDocument()

      // Go offline before 3-second timeout
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })

      expect(screen.queryByText(/back online/i)).not.toBeInTheDocument()
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    })
  })

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const { unmount } = render(<OfflineIndicator />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Styling', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
    })

    it('has padding', () => {
      render(<OfflineIndicator />)

      // Get the outermost fixed container
      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('px-4')
      expect(banner).toHaveClass('py-3')
    })

    it('text is centered', () => {
      render(<OfflineIndicator />)

      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('text-center')
    })

    it('text is white', () => {
      render(<OfflineIndicator />)

      const banner = document.querySelector('.fixed')
      expect(banner).toHaveClass('text-white')
    })

    it('message text has font-medium', () => {
      render(<OfflineIndicator />)

      const message = screen.getByText(/changes will sync when online/i)
      expect(message).toHaveClass('font-medium')
    })
  })
})
