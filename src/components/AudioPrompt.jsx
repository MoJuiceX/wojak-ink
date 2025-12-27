import { useState, useEffect } from 'react'
import { toggleMute, getMuteState } from '../utils/soundManager'
import './AudioPrompt.css'

export default function AudioPrompt() {
  const [show, setShow] = useState(true)
  const [muted, setMuted] = useState(getMuteState())

  useEffect(() => {
    // Listen for mute toggle events
    const handleMuteToggle = (e) => {
      setMuted(e.detail.muted)
    }
    window.addEventListener('muteToggle', handleMuteToggle)
    
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setShow(false)
    }, 5000)

    return () => {
      window.removeEventListener('muteToggle', handleMuteToggle)
      clearTimeout(timer)
    }
  }, [])

  const handleClick = () => {
    // Enable audio by ensuring it's not muted
    if (muted) {
      toggleMute()
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="audio-prompt" onClick={handleClick}>
      <div className="audio-prompt-content">
        <div className="audio-prompt-icon">🔊</div>
        <div className="audio-prompt-message">
          Click to enable audio
        </div>
      </div>
    </div>
  )
}

