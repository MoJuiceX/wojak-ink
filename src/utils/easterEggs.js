// Track Easter egg state
const easterEggState = {
  konamiProgress: 0,
  clockClicks: 0,
  secretTyped: '',
}

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

// Konami code detector
export function checkKonamiCode(key, onSuccess) {
  if (key === KONAMI_CODE[easterEggState.konamiProgress]) {
    easterEggState.konamiProgress++
    if (easterEggState.konamiProgress === KONAMI_CODE.length) {
      easterEggState.konamiProgress = 0
      onSuccess()
    }
  } else {
    easterEggState.konamiProgress = 0
  }
}

// Clock click tracker
export function trackClockClick(onSuccess) {
  easterEggState.clockClicks++
  if (easterEggState.clockClicks >= 10) {
    easterEggState.clockClicks = 0
    onSuccess()
  }

  // Reset after 3 seconds of no clicks
  setTimeout(() => {
    easterEggState.clockClicks = 0
  }, 3000)
}

// Secret word detector
export function checkSecretWord(key, onTang, onOrange) {
  easterEggState.secretTyped += key.toLowerCase()

  // Keep only last 10 characters
  if (easterEggState.secretTyped.length > 10) {
    easterEggState.secretTyped = easterEggState.secretTyped.slice(-10)
  }

  if (easterEggState.secretTyped.includes('tang')) {
    easterEggState.secretTyped = ''
    onTang()
  }

  if (easterEggState.secretTyped.includes('orange')) {
    easterEggState.secretTyped = ''
    onOrange()
  }
}


