/**
 * Performance utilities for FPS monitoring and jank detection
 */

let fps = 0
let lastTime = performance.now()
let frameCount = 0
let isMonitoring = false
let rafId = null
let jankThreshold = 16.67 // 60fps = 16.67ms per frame
let jankCount = 0
let frameTimes = []

/**
 * Start FPS monitoring
 */
export function startFPSMonitoring() {
  if (isMonitoring) return
  
  isMonitoring = true
  frameCount = 0
  lastTime = performance.now()
  jankCount = 0
  frameTimes = []
  
  const measure = (currentTime) => {
    if (!isMonitoring) return
    
    frameCount++
    const delta = currentTime - lastTime
    frameTimes.push(delta)
    
    // Keep only last 60 frames
    if (frameTimes.length > 60) {
      frameTimes.shift()
    }
    
    // Detect jank (frame time > threshold)
    if (delta > jankThreshold) {
      jankCount++
    }
    
    // Calculate FPS every second
    if (frameCount % 60 === 0) {
      fps = Math.round(1000 / (delta || 16.67))
      updateFPSDisplay()
    }
    
    lastTime = currentTime
    rafId = requestAnimationFrame(measure)
  }
  
  rafId = requestAnimationFrame(measure)
}

/**
 * Stop FPS monitoring
 */
export function stopFPSMonitoring() {
  isMonitoring = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  hideFPSDisplay()
}

/**
 * Get current FPS
 */
export function getFPS() {
  return fps
}

/**
 * Get jank count (frames that took longer than threshold)
 */
export function getJankCount() {
  return jankCount
}

/**
 * Get average frame time
 */
export function getAverageFrameTime() {
  if (frameTimes.length === 0) return 0
  const sum = frameTimes.reduce((a, b) => a + b, 0)
  return (sum / frameTimes.length).toFixed(2)
}

/**
 * Update FPS display in DOM
 */
function updateFPSDisplay() {
  let display = document.getElementById('fps-debug-display')
  if (!display) {
    display = document.createElement('div')
    display.id = 'fps-debug-display'
    display.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 8px 12px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 999999;
      border: 1px solid #00ff00;
      pointer-events: none;
      user-select: none;
    `
    document.body.appendChild(display)
  }
  
  const avgFrameTime = getAverageFrameTime()
  const jankRate = frameTimes.length > 0 
    ? ((jankCount / frameTimes.length) * 100).toFixed(1)
    : '0.0'
  
  display.innerHTML = `
    <div>FPS: <span style="color: ${fps >= 55 ? '#00ff00' : fps >= 30 ? '#ffff00' : '#ff0000'}">${fps}</span></div>
    <div>Frame Time: ${avgFrameTime}ms</div>
    <div>Jank Rate: ${jankRate}%</div>
    <div>Frames: ${frameTimes.length}</div>
  `
}

/**
 * Hide FPS display
 */
function hideFPSDisplay() {
  const display = document.getElementById('fps-debug-display')
  if (display) {
    display.remove()
  }
}

/**
 * Toggle FPS monitoring
 */
export function toggleFPSMonitoring() {
  if (isMonitoring) {
    stopFPSMonitoring()
    return false
  } else {
    startFPSMonitoring()
    return true
  }
}

/**
 * Check if monitoring is active
 */
export function isMonitoringActive() {
  return isMonitoring
}


