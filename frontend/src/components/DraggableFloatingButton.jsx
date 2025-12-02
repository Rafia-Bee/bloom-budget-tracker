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
    return saved ? JSON.parse(saved) : { bottom: 32 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef(null)

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('floatingButtonPosition', JSON.stringify(position))
  }, [position])

  const handleMouseDown = (e) => {
    // Only start drag if clicking on the button itself, not the menu
    if (!e.target.closest('.add-menu-popup')) {
      setIsDragging(true)
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

    // Calculate new position (constrained to viewport, vertical only)
    // Min: 80px from bottom, Max: 80px from top
    const newBottom = Math.max(80, Math.min(window.innerHeight - 80, dragStart.startBottom + deltaY))

    setPosition({
      bottom: newBottom,
    })
  }

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false)
      // If we barely moved, treat it as a click
      const deltaY = Math.abs(dragStart.y - e.clientY)
      if (deltaY < 5) {
        onToggleMenu()
      }
    }
  }

  const handleTouchStart = (e) => {
    if (!e.target.closest('.add-menu-popup')) {
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({
        y: touch.clientY,
        startBottom: position.bottom,
      })
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const deltaY = dragStart.y - touch.clientY

    // Min: 80px from bottom, Max: 80px from top
    const newBottom = Math.max(80, Math.min(window.innerHeight - 80, dragStart.startBottom + deltaY))

    setPosition({
      bottom: newBottom,
    })
    e.preventDefault()
  }

  const handleTouchEnd = (e) => {
    if (isDragging) {
      setIsDragging(false)
      const touch = e.changedTouches[0]
      const deltaY = Math.abs(dragStart.y - touch.clientY)
      if (deltaY < 5) {
        onToggleMenu()
      }
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
  }, [isDragging, dragStart])

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
      className="fixed add-menu z-[100]"
      style={{
        bottom: `${position.bottom}px`,
        right: '32px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {showMenu && (
        <div
          className="add-menu-popup fixed bg-white dark:bg-dark-surface rounded-lg shadow-xl border-2 border-gray-200 dark:border-dark-border p-2 min-w-[150px] z-[101]"
          style={{
            right: '77px',
            bottom: `${menuBottom}px`
          }}
        >
          {children}
        </div>
      )}
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
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
