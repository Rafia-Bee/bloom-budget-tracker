/**
 * Bloom - Export All Reports Button Component
 *
 * Exports all charts from the Reports page as a combined PNG image.
 * Uses html2canvas for image capture. Creates a vertical stack of all charts.
 * Includes subcategory breakdowns for each spending category.
 */

import { useState } from 'react'
import html2canvas from 'html2canvas'
import { analyticsAPI } from '../../api'

// Color palette for categories (matches CategoryBreakdownChart)
const COLORS = [
  '#EC4899', '#10B981', '#6366F1', '#F59E0B', '#EF4444',
  '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
]

function ExportAllReportsButton({ chartRefs, dateRange, categoryData }) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')

  // Draw a pie chart directly on canvas
  const drawPieChart = (ctx, data, centerX, centerY, radius, isDarkMode) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) return

    let currentAngle = -Math.PI / 2 // Start from top

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI

      // Draw slice
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = COLORS[index % COLORS.length]
      ctx.fill()

      currentAngle += sliceAngle
    })

    // Draw inner circle for donut effect
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI)
    ctx.fillStyle = isDarkMode ? '#221F24' : '#FFFFFF'
    ctx.fill()
  }

  // Helper to draw rounded rectangle (cross-browser)
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  // Create a subcategory chart as a canvas
  const createSubcategoryCanvas = (categoryName, subcategoryData, isDarkMode) => {
    const width = 400
    const height = 300
    const canvas = document.createElement('canvas')
    canvas.width = width * 2 // Higher resolution
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)

    // Background with rounded corners
    ctx.fillStyle = isDarkMode ? '#221F24' : '#FFFFFF'
    drawRoundedRect(ctx, 0, 0, width, height, 8)
    ctx.fill()

    // Title
    ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#111827'
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${categoryName} Breakdown`, width / 2, 28)

    // Prepare data
    const chartData = subcategoryData.map((item, index) => ({
      name: item.name,
      value: item.total,
      color: COLORS[index % COLORS.length]
    }))

    // Draw pie chart
    const pieRadius = 70
    const pieCenterX = width / 2
    const pieCenterY = 130
    drawPieChart(ctx, chartData, pieCenterX, pieCenterY, pieRadius, isDarkMode)

    // Draw legend
    const legendY = 220
    const legendItemWidth = 120
    const itemsPerRow = Math.min(3, chartData.length)
    const legendStartX = (width - (itemsPerRow * legendItemWidth)) / 2

    chartData.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow)
      const col = index % itemsPerRow
      const x = legendStartX + col * legendItemWidth
      const y = legendY + row * 25

      // Color dot
      ctx.beginPath()
      ctx.arc(x + 8, y + 6, 5, 0, 2 * Math.PI)
      ctx.fillStyle = item.color
      ctx.fill()

      // Label
      ctx.fillStyle = isDarkMode ? '#D1D5DB' : '#374151'
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'left'
      const displayName = item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name
      ctx.fillText(displayName, x + 18, y + 10)
    })

    return canvas
  }

  const exportAllToPNG = async () => {
    setExporting(true)
    setProgress('Preparing...')

    try {
      const isDarkMode = document.documentElement.classList.contains('dark')
      const canvases = []

      // Hide all export buttons before capture
      setProgress('Capturing main charts...')
      const exportButtons = document.querySelectorAll('[title="Export chart"]')
      exportButtons.forEach(btn => {
        const parent = btn.closest('div[class*="relative"]')
        if (parent) parent.style.visibility = 'hidden'
      })

      // Also hide this button
      const thisButton = document.querySelector('[data-export-all-button]')
      if (thisButton) {
        thisButton.style.visibility = 'hidden'
      }

      // Small delay for DOM update
      await new Promise(resolve => setTimeout(resolve, 100))

      // Capture main charts
      const mainCharts = [
        { ref: chartRefs.spendingTrends, name: 'Spending Trends' },
        { ref: chartRefs.categoryBreakdown, name: 'Spending by Category' },
        { ref: chartRefs.debtPayoff, name: 'Debt Payoff Progress' }
      ]

      for (const chart of mainCharts) {
        if (!chart.ref?.current) continue
        setProgress(`Capturing ${chart.name}...`)
        const canvas = await html2canvas(chart.ref.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false
        })
        canvases.push({ canvas, name: chart.name, isSubcategory: false })
      }

      // Restore export buttons
      exportButtons.forEach(btn => {
        const parent = btn.closest('div[class*="relative"]')
        if (parent) parent.style.visibility = 'visible'
      })
      if (thisButton) {
        thisButton.style.visibility = 'visible'
      }

      // Fetch and render subcategory charts
      if (categoryData?.categories?.length > 0) {
        for (const category of categoryData.categories) {
          setProgress(`Loading ${category.name} subcategories...`)
          try {
            const params = {
              start_date: dateRange.start,
              end_date: dateRange.end,
              category: category.name
            }
            const response = await analyticsAPI.getSpendingBySubcategory(params)
            const subcategories = response.data.subcategories

            if (subcategories && subcategories.length > 0) {
              const canvas = createSubcategoryCanvas(category.name, subcategories, isDarkMode)
              canvases.push({ canvas, name: `${category.name} Breakdown`, isSubcategory: true })
            }
          } catch (err) {
            console.warn(`Failed to fetch subcategories for ${category.name}:`, err)
          }
        }
      }

      if (canvases.length === 0) {
        console.error('No charts to export')
        setExporting(false)
        return
      }

      // Calculate combined canvas dimensions
      setProgress('Generating image...')
      const padding = 40
      const titleHeight = 100
      const sectionGap = 50
      const chartSpacing = 20
      const subcategorySectionTitle = 60

      // Separate main and subcategory canvases
      const mainCanvases = canvases.filter(c => !c.isSubcategory)
      const subcategoryCanvases = canvases.filter(c => c.isSubcategory)

      // Calculate dimensions
      const maxMainWidth = mainCanvases.length > 0 ? Math.max(...mainCanvases.map(c => c.canvas.width)) : 0
      const subcategoryWidth = subcategoryCanvases.length > 0 ? subcategoryCanvases[0].canvas.width : 0
      const subcategoriesPerRow = 2
      const subcategoryRows = Math.ceil(subcategoryCanvases.length / subcategoriesPerRow)
      const subcategoryRowWidth = subcategoryWidth * subcategoriesPerRow + chartSpacing

      const totalWidth = Math.max(maxMainWidth, subcategoryRowWidth) + (padding * 2)

      let totalHeight = titleHeight + padding
      // Main charts
      totalHeight += mainCanvases.reduce((sum, c) => sum + c.canvas.height + chartSpacing, 0)
      // Subcategory section
      if (subcategoryCanvases.length > 0) {
        totalHeight += sectionGap + subcategorySectionTitle
        const subcategoryHeight = subcategoryCanvases[0].canvas.height
        totalHeight += subcategoryRows * (subcategoryHeight + chartSpacing)
      }

      // Create combined canvas
      const combinedCanvas = document.createElement('canvas')
      combinedCanvas.width = totalWidth
      combinedCanvas.height = totalHeight
      const ctx = combinedCanvas.getContext('2d')

      // Fill background
      ctx.fillStyle = isDarkMode ? '#19171A' : '#F9FAFB'
      ctx.fillRect(0, 0, totalWidth, totalHeight)

      // Add title
      ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#111827'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Financial Report', totalWidth / 2, 50)

      // Add date range
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280'
      ctx.font = '20px system-ui, -apple-system, sans-serif'
      ctx.fillText(
        `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`,
        totalWidth / 2,
        80
      )

      // Draw main charts
      let yOffset = titleHeight
      for (const { canvas } of mainCanvases) {
        const x = (totalWidth - canvas.width) / 2
        ctx.drawImage(canvas, x, yOffset)
        yOffset += canvas.height + chartSpacing
      }

      // Draw subcategory section
      if (subcategoryCanvases.length > 0) {
        yOffset += sectionGap

        // Section title
        ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#111827'
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
        ctx.fillText('Category Breakdowns', totalWidth / 2, yOffset + 25)
        yOffset += subcategorySectionTitle

        // Draw subcategory charts in a grid
        const startX = (totalWidth - subcategoryRowWidth) / 2
        for (let i = 0; i < subcategoryCanvases.length; i++) {
          const col = i % subcategoriesPerRow
          const row = Math.floor(i / subcategoriesPerRow)
          const { canvas } = subcategoryCanvases[i]

          const x = startX + col * (canvas.width + chartSpacing)
          const y = yOffset + row * (canvas.height + chartSpacing)
          ctx.drawImage(canvas, x, y)
        }
      }

      // Download
      setProgress('Downloading...')
      const link = document.createElement('a')
      link.download = `bloom-report-${dateRange.start}-to-${dateRange.end}.png`
      link.href = combinedCanvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Export all failed:', error)
    } finally {
      setExporting(false)
      setProgress('')
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <button
      onClick={exportAllToPNG}
      disabled={exporting}
      data-export-all-button
      className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white rounded-lg transition-colors text-sm font-medium"
    >
      {exporting ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {progress || 'Exporting...'}
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Export All as PNG
        </>
      )}
    </button>
  )
}

export default ExportAllReportsButton
