import { createContext, useContext, useState } from 'react'

/**
 * OrangeGameContext - Provides shared state for the orange game
 * Exposes smashed count, goal, and reset function for components like ReadmeWindow
 */
const OrangeGameContext = createContext(null)

export function OrangeGameProvider({ children }) {
  const [smashed, setSmashed] = useState(0)
  const [goal, setGoal] = useState(1000) // Default goal (matches JUICE_MAX)
  
  const resetGame = () => {
    setSmashed(0)
  }

  return (
    <OrangeGameContext.Provider value={{ smashed, goal, setSmashed, setGoal, resetGame }}>
      {children}
    </OrangeGameContext.Provider>
  )
}

export function useOrangeGame() {
  const context = useContext(OrangeGameContext)
  if (!context) {
    // Return default values if context is not available (for SSR/build safety)
    return { smashed: 0, goal: 1000, setSmashed: () => {}, setGoal: () => {}, resetGame: () => {} }
  }
  return context
}

