/**
 * Bloom - Login Page
 *
 * User authentication login form with email and password validation.
 * Redirects to dashboard on successful authentication.
 */

import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api'
import ForgotPasswordModal from '../components/ForgotPasswordModal'
import ThemeToggle from '../components/ThemeToggle'

function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.login({ email, password })
      // Tokens are now in httpOnly cookies - no localStorage needed (#80 security fix)
      localStorage.setItem('user_email', response.data.user.email) // Keep email for UI
      setIsAuthenticated(true)
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  const handleForgotPasswordSuccess = (message) => {
    // Security fix (#82): Never display token in UI
    // Production or development: Show standard success message
    setResetMessage('✅ Password reset email sent!\n\nCheck your email inbox for a link to reset your password. The link will expire in 1 hour.')
    setShowForgotPassword(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bloom-light to-bloom-pink/20 dark:from-dark-base dark:to-dark-surface">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-bloom-pink dark:text-dark-pink mb-2">Bloom</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">Financial Habits That Grow With You</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-950/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-dark-danger px-4 py-3 rounded flex justify-between items-start">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-700 dark:text-dark-danger hover:text-red-900 dark:hover:text-red-400 ml-4 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {resetMessage && (
            <div className="bg-green-100 dark:bg-green-950/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-dark-success px-4 py-3 rounded flex justify-between items-start">
              <pre className="text-sm whitespace-pre-wrap">{resetMessage}</pre>
              <button
                type="button"
                onClick={() => setResetMessage('')}
                className="text-green-700 dark:text-dark-success hover:text-green-900 dark:hover:text-green-400 ml-4 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div>
            <label className="block text-gray-700 dark:text-dark-text font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink dark:bg-dark-elevated dark:text-dark-text"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 dark:text-dark-text font-semibold">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-bloom-pink dark:text-dark-pink text-sm hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink dark:focus:ring-dark-pink dark:bg-dark-elevated dark:text-dark-text"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bloom-pink dark:bg-dark-pink text-white font-semibold py-3 rounded-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink-hover transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600 dark:text-dark-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-bloom-pink dark:text-dark-pink font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onSuccess={handleForgotPasswordSuccess}
        />
      )}
    </div>
  )
}

export default Login
