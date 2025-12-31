import { useState, useEffect } from 'react'
import './Clippy.css'

const CLIPPY_MESSAGES = [
  "It looks like you're making a Wojak! Need help?",
  "Did you know? Tang Gang was founded in 2024!",
  "Pro tip: Try the CyberTang for maximum vibes! 🍊",
  "You've been staring at this screen for a while...",
  "Have you tried clicking Randomize?",
  "Orange you glad you found this app?",
]

export default function Clippy({ isVisible, onClose }) {
  const [message, setMessage] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setMessage(CLIPPY_MESSAGES[Math.floor(Math.random() * CLIPPY_MESSAGES.length)])
      setIsAnimating(true)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className={`clippy-container ${isAnimating ? 'animate' : ''}`}>
      <div className="clippy-character">
        🍊
      </div>
      <div className="clippy-bubble">
        <button className="clippy-close" onClick={onClose}>×</button>
        <p>{message}</p>
        <div className="clippy-buttons">
          <button onClick={onClose}>Thanks!</button>
          <button onClick={onClose}>Go away</button>
        </div>
      </div>
    </div>
  )
}

















