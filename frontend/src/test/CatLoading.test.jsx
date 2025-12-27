/**
 * CatLoading Test Suite
 *
 * Tests the cute cat loading animation component.
 * Verifies animation display, message customization, and loading dots.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CatLoading from '../components/CatLoading'

describe('CatLoading', () => {
  describe('Rendering', () => {
    it('renders the component', () => {
      render(<CatLoading />)

      expect(screen.getByText(/waking up the server/i)).toBeInTheDocument()
    })

    it('displays default loading message', () => {
      render(<CatLoading />)

      expect(screen.getByText('Waking up the server...')).toBeInTheDocument()
    })

    it('displays custom message when provided', () => {
      render(<CatLoading message="Loading your budget..." />)

      expect(screen.getByText('Loading your budget...')).toBeInTheDocument()
    })

    it('shows please wait text', () => {
      render(<CatLoading />)

      expect(screen.getByText(/please wait while we fetch your data/i)).toBeInTheDocument()
    })

    it('includes cat emoji in wait text', () => {
      render(<CatLoading />)

      expect(screen.getByText(/🐱/)).toBeInTheDocument()
    })
  })

  describe('Video Animation', () => {
    it('renders a video element', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
    })

    it('video has autoPlay attribute', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video).toHaveAttribute('autoplay')
    })

    it('video has loop attribute', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video).toHaveAttribute('loop')
    })

    it('video has muted attribute', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video.muted).toBe(true)
    })

    it('video has playsInline attribute', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video).toHaveAttribute('playsinline')
    })

    it('video has correct dimensions', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video).toHaveClass('w-64')
      expect(video).toHaveClass('h-64')
    })

    it('video source is from catAnimations array', () => {
      render(<CatLoading />)

      const video = document.querySelector('video')
      const src = video.getAttribute('src')

      const validAnimations = [
        '/bloom-kitty-banker.mp4',
        '/bloom-coin-sorter.mp4',
        '/bloom-runner-kitty.mp4',
        '/bloom-printer-kitty.mp4',
        '/bloom-filing-kitty.mp4',
        '/bloom-runner-kitty-2.mp4',
        '/bloom-sleepy-kitty.mp4',
      ]

      expect(validAnimations).toContain(src)
    })
  })

  describe('Loading Dots', () => {
    it('renders three bouncing dots', () => {
      render(<CatLoading />)

      const dots = document.querySelectorAll('.animate-bounce')
      expect(dots).toHaveLength(3)
    })

    it('dots have correct styling', () => {
      render(<CatLoading />)

      const dots = document.querySelectorAll('.animate-bounce')
      dots.forEach(dot => {
        expect(dot).toHaveClass('w-3')
        expect(dot).toHaveClass('h-3')
        expect(dot).toHaveClass('rounded-full')
        expect(dot).toHaveClass('bg-bloom-pink')
      })
    })
  })

  describe('Layout', () => {
    it('centers content on screen', () => {
      render(<CatLoading />)

      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
    })

    it('has background styling', () => {
      render(<CatLoading />)

      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('bg-bloom-light')
    })

    it('message has bloom-pink color', () => {
      render(<CatLoading />)

      const message = screen.getByText('Waking up the server...')
      expect(message).toHaveClass('text-bloom-pink')
    })

    it('message has proper font styling', () => {
      render(<CatLoading />)

      const message = screen.getByText('Waking up the server...')
      expect(message).toHaveClass('text-2xl')
      expect(message).toHaveClass('font-semibold')
    })
  })

  describe('Random Animation Selection', () => {
    it('selects animation on component mount', () => {
      // Mock Math.random to return predictable value
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0)

      render(<CatLoading />)

      const video = document.querySelector('video')
      expect(video.getAttribute('src')).toBe('/bloom-kitty-banker.mp4')

      mockRandom.mockRestore()
    })

    it('can select different animation based on random value', () => {
      // Mock Math.random to return different value (index 2)
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.3)

      render(<CatLoading />)

      const video = document.querySelector('video')
      // 0.3 * 7 = 2.1, Math.floor = 2, so index 2
      expect(video.getAttribute('src')).toBe('/bloom-runner-kitty.mp4')

      mockRandom.mockRestore()
    })
  })
})
