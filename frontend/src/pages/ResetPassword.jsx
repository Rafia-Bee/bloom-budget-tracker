/**
 * Bloom - Reset Password Page
 *
 * Page component for resetting password using a valid token.
 * Validates token and allows user to set a new password.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import ThemeToggle from '../components/ThemeToggle'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await api.post('/auth/validate-reset-token', { token })

      if (response.data.valid) {
        setTokenValid(true)
      } else {
        setError(response.data.error || 'Invalid or expired reset token')
        setTokenValid(false)
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Unable to validate reset token')
      setTokenValid(false)
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password
      })

      if (response.data) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (error) {
      setError(error.response?.data?.error || 'An error occurred while resetting your password')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-dark-base dark:to-dark-surface flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bloom-pink dark:border-dark-pink mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-dark-text-secondary">Validating reset token...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-pink-600 dark:hover:bg-dark-pink-hover transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">Password Reset Successful</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">Your password has been successfully reset. You will be redirected to the login page.</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bloom-pink dark:border-dark-pink mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-dark-base dark:to-dark-surface flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-bloom-pink/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-bloom-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">Reset Your Password</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-dark-danger rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-mint dark:focus:ring-dark-mint dark:bg-dark-elevated dark:text-dark-text"
              placeholder="Enter new password"
              required
              disabled={loading}
              minLength={8}
            />
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">Must be at least 8 characters long</p>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-mint dark:focus:ring-dark-mint dark:bg-dark-elevated dark:text-dark-text"
              placeholder="Confirm new password"
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-bloom-pink dark:bg-dark-pink text-white rounded-lg hover:bg-pink-600 dark:hover:bg-dark-pink-hover transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/login')}
            className="text-bloom-pink dark:text-dark-pink hover:text-pink-600 dark:hover:text-dark-pink-hover text-sm font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword