/**
 * Bloom - Draggable Floating Button
 *
 * A draggable floating action button that can be repositioned by the user.
 * Persists position in localStorage. Shows menu of quick actions.
 */

import React, { useState, useRef, useEffect } from 'react'

function DraggableFloatingButton({ showMenu, onToggleMenu, children }) {
  const [position, setPosition] = useState(() => {
    // Load saved position from localStorage
    const saved = localStorage.getItem('floatingButtonPosition')
    return saved ? JSON.parse(saved) : { bottom: 100 } // Start in safe zone
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false) // Track if user actually dragged
  const buttonRef = useRef(null)

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('floatingButtonPosition', JSON.stringify(position))
  }, [position])

  const handleMouseDown = (e) => {
    // Only start drag if clicking on the button itself, not the menu
    if (!e.target.closest('.add-menu-popup')) {
      setIsDragging(true)
      setHasMoved(false)
      setDragStart({
        y: e.clientY,
        startBottom: position.bottom,
      })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return

    const deltaY = dragStart.y - e.clientY

    // Only enter drag mode if moved more than 10px (prevents accidental drags)
    if (Math.abs(deltaY) > 10) {
      setHasMoved(true)

      // Calculate new position (constrained to viewport, vertical only)
      // Min: 100px from bottom (safe zone), Max: 100px from top (safe zone)
      const safeZone = 100
      const newBottom = Math.max(safeZone, Math.min(window.innerHeight - safeZone, dragStart.startBottom + deltaY))

      setPosition({
        bottom: newBottom,
      })
    }
  }

  const handleMouseUp = (e) => {
    if (isDragging) {
      const wasDragging = hasMoved
      setIsDragging(false)
      setHasMoved(false)

      // Only trigger menu if we didn't actually drag
      if (!wasDragging) {
        // Small delay to ensure state is updated before toggle
        setTimeout(() => onToggleMenu(), 0)
      }
    }
  }

  const handleTouchStart = (e) => {
    if (!e.target.closest('.add-menu-popup')) {
      const touch = e.touches[0]
      setIsDragging(true)
      setHasMoved(false)
      setDragStart({
        y: touch.clientY,
        startBottom: position.bottom,
        timestamp: Date.now(), // Track when touch started
      })
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const deltaY = dragStart.y - touch.clientY

    // Only enter drag mode if moved more than 10px (prevents accidental drags during scroll)
    if (Math.abs(deltaY) > 10) {
      setHasMoved(true)

      // Min: 100px from bottom (safe zone), Max: 100px from top (safe zone)
      const safeZone = 100
      const newBottom = Math.max(safeZone, Math.min(window.innerHeight - safeZone, dragStart.startBottom + deltaY))

      setPosition({
        bottom: newBottom,
      })
      e.preventDefault() // Only prevent default when actually dragging
    }
  }

  const handleTouchEnd = (e) => {
    if (isDragging) {
      setIsDragging(false)
      const touchDuration = Date.now() - dragStart.timestamp

      // Treat as click if: didn't move AND touch was quick (< 300ms)
      if (!hasMoved && touchDuration < 300) {
        e.preventDefault()
        onToggleMenu()
      }
      setHasMoved(false)
    }
  }

  // Simple click handler as fallback for better reliability
  const handleClick = (e) => {
    // Always try to toggle if not actively moving
    // This ensures desktop clicks work even if isDragging was set
    if (!hasMoved) {
      e.stopPropagation()
      onToggleMenu()
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, dragStart, hasMoved, position])

  // Calculate menu position - show above button unless too close to top
  const menuHeight = 180 // Approximate height of 3-button menu
  const buttonHeight = 64
  const menuAboveButton = position.bottom + buttonHeight + 10
  const showMenuBelow = menuAboveButton + menuHeight > window.innerHeight

  const menuBottom = showMenuBelow
    ? position.bottom - menuHeight - 10  // Below button
    : position.bottom + buttonHeight + 10 // Above button

  return (
    <div
      ref={buttonRef}
      className="fixed add-menu z-[9999]"
      style={{
        bottom: `${position.bottom}px`,
        right: '32px',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none', // Prevent browser touch gestures
      }}
    >
      {showMenu && (
        <div
          className="add-menu-popup fixed bg-white dark:bg-dark-surface rounded-lg shadow-xl border-2 border-gray-200 dark:border-dark-border p-2 min-w-[150px] z-[10000]"
          style={{
            right: '77px',
            bottom: `${menuBottom}px`,
            touchAction: 'auto', // Allow touch on menu items
          }}
        >
          {children}
        </div>
      )}
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        className={`bg-bloom-pink dark:bg-dark-pink text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-bloom-pink/90 dark:hover:bg-dark-pink/80 transition-transform ${
          isDragging ? 'scale-110' : 'hover:scale-110'
        }`}
        style={{ touchAction: 'none' }}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

export default DraggableFloatingButton
