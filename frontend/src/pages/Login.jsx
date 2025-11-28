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

function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState('test@bloom.com')
  const [password, setPassword] = useState('password123')
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
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('refresh_token', response.data.refresh_token)
      localStorage.setItem('user_email', response.data.user.email)
      setIsAuthenticated(true)
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  const handleForgotPasswordSuccess = (message, token) => {
    if (token) {
      // Development mode: Email service not configured, show token for testing
      setResetMessage(`${message}\n\n🔧 Development Mode: Email not configured\n\nReset Token: ${token}\n\nTest URL: http://localhost:5173/reset-password?token=${token}`)
    } else {
      // Production mode: Email sent
      setResetMessage('✅ Password reset email sent!\n\nCheck your email inbox for a link to reset your password. The link will expire in 1 hour.')
    }
    setShowForgotPassword(false)
    setTimeout(() => setResetMessage(''), 15000) // Clear message after 15 seconds
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bloom-light to-bloom-pink/20">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-bloom-pink mb-2">Bloom</h1>
          <p className="text-gray-600">Financial Habits That Grow With You</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex justify-between items-start">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-700 hover:text-red-900 ml-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {resetMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <pre className="text-sm whitespace-pre-wrap">{resetMessage}</pre>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 font-semibold">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-bloom-pink text-sm hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bloom-pink"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bloom-pink text-white font-semibold py-3 rounded-lg hover:bg-bloom-pink/90 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-bloom-pink font-semibold hover:underline">
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
