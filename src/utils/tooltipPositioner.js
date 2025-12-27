/**
 * Utility to position tooltips and prevent clipping
 * Call this on mouseenter for elements with win98-tooltip class
 */
export function positionTooltip(element) {
  if (!element || !element.classList.contains('win98-tooltip')) return

  const tooltipText = element.getAttribute('data-tooltip')
  if (!tooltipText) return

  // Get button position
  const rect = element.getBoundingClientRect()
  
  // Create temporary element to measure actual tooltip width
  const temp = document.createElement('div')
  temp.style.position = 'fixed'
  temp.style.visibility = 'hidden'
  temp.style.whiteSpace = 'nowrap'
  // Use clamp to viewport: min(250px, 90vw) matches CSS
  const maxTooltipWidth = Math.min(250, window.innerWidth * 0.9)
  temp.style.maxWidth = `${maxTooltipWidth}px`
  temp.style.whiteSpace = 'normal'
  temp.style.padding = '4px 8px'
  temp.style.fontSize = '11px'
  temp.style.fontFamily = 'MS Sans Serif, Tahoma, sans-serif'
  temp.textContent = tooltipText
  document.body.appendChild(temp)
  const tooltipWidth = Math.max(100, Math.min(temp.offsetWidth, maxTooltipWidth))
  const tooltipHeight = temp.offsetHeight
  document.body.removeChild(temp)
  
  // Calculate where tooltip should be positioned (centered above button)
  const buttonCenterX = rect.left + rect.width / 2
  let tooltipLeft = buttonCenterX - tooltipWidth / 2
  const tooltipTop = rect.top - tooltipHeight - 10 // 8px gap + 2px arrow
  
  // Check if tooltip would be cut off - clamp to viewport
  const viewportPadding = 10
  const minLeft = viewportPadding
  const maxRight = window.innerWidth - viewportPadding
  
  // Adjust if needed
  if (tooltipLeft < minLeft) {
    // Tooltip would be cut off on the left - align to left edge with padding
    tooltipLeft = minLeft
    element.setAttribute('data-tooltip-adjust', 'left')
    element.style.setProperty('--tooltip-offset', `${buttonCenterX - tooltipLeft}px`)
  } else if (tooltipLeft + tooltipWidth > maxRight) {
    // Tooltip would be cut off on the right - align to right edge with padding
    tooltipLeft = maxRight - tooltipWidth
    element.setAttribute('data-tooltip-adjust', 'right')
    element.style.setProperty('--tooltip-offset', `${buttonCenterX - (tooltipLeft + tooltipWidth)}px`)
  } else {
    // Centered - no adjustment needed
    element.removeAttribute('data-tooltip-adjust')
    element.style.removeProperty('--tooltip-offset')
  }
}

