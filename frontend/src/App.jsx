/**
 * Bloom - Main Application Component
 *
 * Handles routing and authentication state management.
 * Protects routes and redirects based on authentication status.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Debts from './pages/Debts'
import RecurringExpenses from './pages/RecurringExpenses'
import ResetPassword from './pages/ResetPassword'
import Admin from './pages/Admin'
import Settings from './pages/Settings'
import Goals from './pages/Goals'
import Trash from './pages/Trash'
import Reports from './pages/Reports'
import CatLoading from './components/CatLoading'
import OfflineIndicator from './components/OfflineIndicator'
import { setLoadingCallback, authAPI } from './api'
import { FeatureFlagProvider } from './contexts/FeatureFlagContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CurrencyProvider } from './contexts/CurrencyContext'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiLoading, setApiLoading] = useState(false)
  const pendingRequests = useRef(0)
  const initialLoadComplete = useRef(false)

  useEffect(() => {
    // Check authentication by trying to fetch current user (#80 security fix)
    // Cookies are automatically sent with requests
    const checkAuth = async () => {
      try {
        await authAPI.getCurrentUser()
        setIsAuthenticated(true)
      } catch (error) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    setTimeout(() => {
      initialLoadComplete.current = true
    }, 1000)

    setLoadingCallback((isLoading) => {
      if (!initialLoadComplete.current) return

      if (isLoading) {
        pendingRequests.current += 1
        if (pendingRequests.current === 1) {
          setApiLoading(true)
        }
      } else {
        pendingRequests.current = Math.max(0, pendingRequests.current - 1)
        if (pendingRequests.current === 0) {
          setApiLoading(false)
        }
      }
    })
  }, [])

  if (loading) {
    return <CatLoading message="Loading your budget..." />
  }

  return (
    <ThemeProvider>
      <FeatureFlagProvider>
        <CurrencyProvider isAuthenticated={isAuthenticated}>
        <OfflineIndicator />
        {apiLoading && (
          <div className="fixed inset-0 z-50">
            <CatLoading message="Waking up the server..." />
          </div>
        )}
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/debts"
          element={isAuthenticated ? <Debts setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/recurring-expenses"
          element={isAuthenticated ? <RecurringExpenses setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/goals"
          element={isAuthenticated ? <Goals setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/trash"
          element={isAuthenticated ? <Trash setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/reports"
          element={isAuthenticated ? <Reports setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={isAuthenticated ? <Admin /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </Router>
      </CurrencyProvider>
      </FeatureFlagProvider>
    </ThemeProvider>
  )
}

export default App
