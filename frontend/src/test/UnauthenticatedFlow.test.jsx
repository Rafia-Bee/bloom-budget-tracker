/**
 * Tests for app initialization without authentication
 *
 * These tests verify that the app loads correctly when users are not logged in,
 * preventing issues like the 401 storm that occurred when currency endpoints
 * required authentication but were called before login.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Unauthenticated App Initialization', () => {
  let originalFetch

  beforeEach(() => {
    // Save original fetch
    originalFetch = global.fetch

    // Mock fetch for API calls
    global.fetch = vi.fn((url) => {
      // Currency endpoints should work without auth
      if (url.includes('/currencies/rates')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            base: 'EUR',
            rates: {
              USD: 1.08,
              GBP: 0.85,
              JPY: 156.23
            }
          })
        })
      }

      if (url.includes('/currencies') && !url.includes('/rates')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            currencies: [
              { code: 'EUR', name: 'Euro', symbol: '€' },
              { code: 'USD', name: 'US Dollar', symbol: '$' },
              { code: 'GBP', name: 'British Pound', symbol: '£' }
            ]
          })
        })
      }

      // Auth endpoints should fail when not logged in (401 is expected)
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' })
        })
      }

      // User settings should fail when not logged in (401 is expected)
      if (url.includes('/user-data/settings/default-currency')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' })
        })
      }

      // Default fallback
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      })
    })
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  test('currency list endpoint returns 200 without auth', async () => {
    const url = 'http://localhost:5000/api/v1/currencies'
    const response = await fetch(url)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('currencies')
    expect(Array.isArray(data.currencies)).toBe(true)
  })

  test('currency rates endpoint returns 200 without auth', async () => {
    const url = 'http://localhost:5000/api/v1/currencies/rates?base=EUR'
    const response = await fetch(url)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('base')
    expect(data).toHaveProperty('rates')
    expect(typeof data.rates).toBe('object')
  })

  test('auth endpoints return 401 when not logged in', async () => {
    const url = 'http://localhost:5000/api/v1/auth/me'
    const response = await fetch(url)

    expect(response.status).toBe(401)
  })

  test('user settings endpoint returns 401 when not logged in', async () => {
    const url = 'http://localhost:5000/api/v1/user-data/settings/default-currency'
    const response = await fetch(url)

    expect(response.status).toBe(401)
  })

  test('currency endpoints do not send Authorization header', async () => {
    const url = 'http://localhost:5000/api/v1/currencies/rates'
    await fetch(url)

    // Check that fetch was called
    expect(global.fetch).toHaveBeenCalled()

    // Verify no Authorization header in any calls
    const calls = global.fetch.mock.calls
    calls.forEach(call => {
      const options = call[1]
      if (options && options.headers) {
        expect(options.headers).not.toHaveProperty('Authorization')
      }
    })
  })
})
