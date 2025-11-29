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
import CatLoading from './components/CatLoading'
import { setLoadingCallback } from './api'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiLoading, setApiLoading] = useState(false)
  const pendingRequests = useRef(0)
  const initialLoadComplete = useRef(false)
  const loadingStartTime = useRef(null)
  const minLoadingDuration = 3000 // Show loading for minimum 3 seconds (one GIF loop)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
    setLoading(false)

    setTimeout(() => {
      initialLoadComplete.current = true
    }, 1000)

    setLoadingCallback((isLoading) => {
      if (!initialLoadComplete.current) return

      if (isLoading) {
        pendingRequests.current += 1
        if (pendingRequests.current === 1) {
          loadingStartTime.current = Date.now()
          setApiLoading(true)
        }
      } else {
        pendingRequests.current = Math.max(0, pendingRequests.current - 1)
        if (pendingRequests.current === 0) {
          const elapsedTime = Date.now() - loadingStartTime.current
          const remainingTime = Math.max(0, minLoadingDuration - elapsedTime)

          setTimeout(() => {
            setApiLoading(false)
          }, remainingTime)
        }
      }
    })
  }, [])

  if (loading) {
    return <CatLoading message="Loading your budget..." />
  }

  return (
    <>
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
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
