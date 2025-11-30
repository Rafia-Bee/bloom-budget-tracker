/**
 * Bloom - Offline Indicator Component
 *
 * Displays banner when user is offline.
 * Shows sync status when connection is restored.
 */

import { useState, useEffect } from 'react'

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showSyncMessage, setShowSyncMessage] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowSyncMessage(true)
      // Hide sync message after 3 seconds
      setTimeout(() => setShowSyncMessage(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowSyncMessage(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showSyncMessage) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-white transition-colors ${
      isOnline ? 'bg-green-500' : 'bg-orange-500'
    }`}>
      {isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Back online! Syncing data...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span className="font-medium">You're offline. Changes will sync when online.</span>
        </div>
      )}
    </div>
  )
}

export default OfflineIndicator
