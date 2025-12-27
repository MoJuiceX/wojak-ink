import { useState, useEffect } from 'react'
import './OrangeRain.css'

export default function OrangeRain({ isActive, duration = 5000, onComplete }) {
  const [oranges, setOranges] = useState([])

  useEffect(() => {
    if (!isActive) return

    // Create oranges
    const newOranges = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 20 + Math.random() * 30,
      emoji: ['🍊', '🍋', '🥤', '🌴', '☀️'][Math.floor(Math.random() * 5)],
    }))
    setOranges(newOranges)

    // End after duration
    const timeout = setTimeout(() => {
      setOranges([])
      onComplete?.()
    }, duration)

    return () => clearTimeout(timeout)
  }, [isActive, duration, onComplete])

  if (!isActive || oranges.length === 0) return null

  return (
    <div className="orange-rain">
      {oranges.map(orange => (
        <div
          key={orange.id}
          className="orange-rain-drop"
          style={{
            left: `${orange.x}%`,
            animationDelay: `${orange.delay}s`,
            animationDuration: `${orange.duration}s`,
            fontSize: orange.size,
          }}
        >
          {orange.emoji}
        </div>
      ))}
    </div>
  )
}
















