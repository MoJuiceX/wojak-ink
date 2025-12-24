import { createContext, useContext, useState, useCallback } from 'react'

const ScreensaverContext = createContext()

export function ScreensaverProvider({ children }) {
  const [isTangifying, setIsTangifying] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const setTangifying = useCallback((value) => {
    setIsTangifying(value)
  }, [])

  const setInputFocused = useCallback((value) => {
    setIsInputFocused(value)
  }, [])

  return (
    <ScreensaverContext.Provider
      value={{
        isTangifying,
        isInputFocused,
        setTangifying,
        setInputFocused,
      }}
    >
      {children}
    </ScreensaverContext.Provider>
  )
}

export function useScreensaver() {
  const context = useContext(ScreensaverContext)
  if (!context) {
    throw new Error('useScreensaver must be used within ScreensaverProvider')
  }
  return context
}


