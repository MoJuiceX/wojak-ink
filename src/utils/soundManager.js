// Windows 98 Sound Configuration
// Using Jungle theme as default (most iconic Win98 sounds)

// Get current sound theme from localStorage or default to Jungle
export function getSoundTheme() {
  try {
    return localStorage.getItem('soundTheme') || 'Jungle'
  } catch (e) {
    return 'Jungle'
  }
}

// Set sound theme
export function setSoundTheme(theme) {
  // theme: 'Jungle', 'Musica', 'Robotz', 'Utopia'
  try {
    localStorage.setItem('soundTheme', theme)
    // Clear audio cache to force reload with new theme
    Object.keys(audioCache).forEach(key => {
      delete audioCache[key]
    })
    // Preload sounds with new theme
    preloadSounds()
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Get current sound mode from localStorage or default to 'standard'
export function getSoundMode() {
  try {
    return localStorage.getItem('soundMode') || 'standard'
  } catch (e) {
    return 'standard'
  }
}

// Set sound mode
export function setSoundMode(mode) {
  // mode: 'standard' or 'party'
  try {
    localStorage.setItem('soundMode', mode)
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Standard mode sounds (Windows 98 Classic) - TRULY MINIMAL
// Classic Windows 98 had very few sounds - most users kept sounds disabled or minimal
// Only system-level sounds and critical errors, NO window interaction sounds
const STANDARD_MODE_SOUNDS = [
  // Critical system sounds only
  'shutdown',
  // Boot/startup sound (for boot sequence)
  'windowsStart',
  // Critical errors only (system-level, not UI errors)
  'error',
  'criticalError',
]

// Build sound paths based on current theme and sound mode
function getSoundPath(soundName, theme = null) {
  const currentTheme = theme || getSoundTheme()
  const currentMode = getSoundMode()
  
  // Standard Windows 98 sounds (short-named files) - used in Standard Mode
  // These are the classic Windows 98 sounds without theme prefixes
  // Note: No startup/boot sound - this is a website, not a computer booting
  const standardSounds = {
    shutdown: '/sounds/w98sounds/LOGOFF.mp3',
    success: '/sounds/w98sounds/CHIMES.mp3',
    tada: '/sounds/w98sounds/TADA.mp3',
    ding: '/sounds/w98sounds/DING.mp3',
    notify: '/sounds/w98sounds/NOTIFY.mp3',
    chord: '/sounds/w98sounds/CHORD.mp3',
    recycleBin: '/sounds/w98sounds/RECYCLE.mp3',
    recycle: '/sounds/w98sounds/RECYCLE.mp3',
    // For standard mode, use NOTIFY for errors (classic Windows 98 didn't have separate error sounds)
    error: '/sounds/w98sounds/NOTIFY.mp3',
    criticalError: '/sounds/w98sounds/NOTIFY.mp3',
    // START.mp3 can be used for windowsStart if available
    windowsStart: '/sounds/w98sounds/START.mp3',
    windowsExit: '/sounds/w98sounds/LOGOFF.mp3',
  }
  
  // If Standard Mode, use standard Windows 98 sounds (short-named files)
  if (currentMode === 'standard') {
    if (standardSounds[soundName]) {
      return standardSounds[soundName]
    }
    // If sound not found in standard sounds, return null (won't play)
    return null
  }
  
  // Party Mode: Use theme-specific sounds
  // Universal sounds that are always available (not theme-specific)
  // Note: No startup/boot sound - this is a website, not a computer booting
  const universalSounds = {
    shutdown: '/sounds/w98sounds/LOGOFF.mp3',
    success: '/sounds/w98sounds/CHIMES.mp3',
    tada: '/sounds/w98sounds/TADA.mp3',
    ding: '/sounds/w98sounds/DING.mp3',
    notify: '/sounds/w98sounds/NOTIFY.mp3',
    chord: '/sounds/w98sounds/CHORD.mp3',
    recycleBin: '/sounds/w98sounds/RECYCLE.mp3',
  }
  
  // Return universal sound if it exists
  if (universalSounds[soundName]) {
    return universalSounds[soundName]
  }
  
  // Theme-specific sounds (used in Party Mode)
  const themeSounds = {
    windowsStart: `${currentTheme} Windows Start.mp3`,
    windowsExit: `${currentTheme} Windows Exit.mp3`,
    windowOpen: `${currentTheme} Open.mp3`,
    windowClose: `${currentTheme} Close.mp3`,
    windowMinimize: `${currentTheme} Minimize.mp3`,
    windowMaximize: `${currentTheme} Maximize.mp3`,
    windowRestoreUp: `${currentTheme} Restore Up.mp3`,
    windowRestoreDown: `${currentTheme} Restore Down.mp3`,
    menuCommand: `${currentTheme} Menu Command.mp3`,
    menuPopup: `${currentTheme} Menu Popup.mp3`,
    click: `${currentTheme} Menu Command.mp3`,
    asterisk: `${currentTheme} Asterisk.mp3`,
    error: `${currentTheme} Error.mp3`,
    criticalError: `${currentTheme} Critical Stop.mp3`,
    exclamation: `${currentTheme} Exclamation.mp3`,
    question: `${currentTheme} Question.mp3`,
    recycle: `${currentTheme} Recycle.mp3`,
    default: `${currentTheme} Default.mp3`,
  }
  
  const fileName = themeSounds[soundName]
  if (fileName) {
    return `/sounds/w98sounds/${fileName}`
  }
  
  // Fallback to default sound if not found
  return `/sounds/w98sounds/${currentTheme} Default.mp3`
}

// Build SOUNDS object dynamically based on current theme
function buildSoundsObject() {
  const theme = getSoundTheme()
  return {
    // Shutdown (no startup/boot sound for website)
    shutdown: getSoundPath('shutdown', theme),
    windowsStart: getSoundPath('windowsStart', theme),
    windowsExit: getSoundPath('windowsExit', theme),
    
    // Window Actions
    windowOpen: getSoundPath('windowOpen', theme),
    windowClose: getSoundPath('windowClose', theme),
    windowMinimize: getSoundPath('windowMinimize', theme),
    windowMaximize: getSoundPath('windowMaximize', theme),
    windowRestoreUp: getSoundPath('windowRestoreUp', theme),
    windowRestoreDown: getSoundPath('windowRestoreDown', theme),
    
    // Menu & UI
    menuCommand: getSoundPath('menuCommand', theme),
    menuPopup: getSoundPath('menuPopup', theme),
    click: getSoundPath('click', theme),
    
    // Notifications & Alerts
    success: getSoundPath('success', theme),
    tada: getSoundPath('tada', theme),
    ding: getSoundPath('ding', theme),
    notify: getSoundPath('notify', theme),
    asterisk: getSoundPath('asterisk', theme),
    
    // Errors & Warnings
    error: getSoundPath('error', theme),
    criticalError: getSoundPath('criticalError', theme),
    exclamation: getSoundPath('exclamation', theme),
    question: getSoundPath('question', theme),
    chord: getSoundPath('chord', theme),
    
    // Recycle Bin
    recycle: getSoundPath('recycle', theme),
    recycleBin: getSoundPath('recycleBin', theme),
    
    // Default/Fallback
    default: getSoundPath('default', theme),
    
    // Legacy support (for backward compatibility)
    trash: getSoundPath('recycle', theme),
    emptyTrash: getSoundPath('recycleBin', theme),
  }
}

let isMuted = false
let backgroundMusic = null // Reference to background music audio element
const audioCache = {}
let muteCheckInterval = null // Interval to continuously check and pause audio when muted

// Load mute state from localStorage
try {
  const storedMute = localStorage.getItem('sound_muted')
  if (storedMute === 'true') {
    isMuted = true
  }
} catch (e) {
  // Ignore localStorage errors
}

// Register background music element with sound manager
export function setBackgroundMusic(audioElement) {
  backgroundMusic = audioElement
  
  // Also store in window for global access (more reliable than DOM queries)
  if (audioElement) {
    window.__wojakBackgroundMusic = audioElement
    window.__wojakBackgroundMusicDirect = audioElement
  } else {
    delete window.__wojakBackgroundMusic
    delete window.__wojakBackgroundMusicDirect
  }
  
  // If muted, pause immediately
  if (isMuted && audioElement && !audioElement.paused) {
    audioElement.pause()
    audioElement.volume = 0
    audioElement.muted = true
  }
}

// Get background music reference
export function getBackgroundMusic() {
  return backgroundMusic
}

// Debug function - can be called from console for troubleshooting
window.testMute = function() {
  console.log('Mute state:', isMuted)
  console.log('Background music reference:', backgroundMusic ? 'exists' : 'null')
  console.log('Window direct reference:', window.__wojakBackgroundMusicDirect ? 'exists' : 'null')
  
  const allAudios = document.querySelectorAll('audio')
  console.log('Found', allAudios.length, 'audio elements')
  allAudios.forEach((audio, i) => {
    const src = audio.src || 'no src'
    console.log(`Audio ${i} (${src.includes('wojakmusic') ? 'BACKGROUND MUSIC' : 'other'}):`, {
      paused: audio.paused,
      muted: audio.muted,
      volume: audio.volume
    })
  })
}

// Preload sounds
export function preloadSounds() {
  const SOUNDS = buildSoundsObject()
  
  Object.entries(SOUNDS).forEach(([key, url]) => {
    try {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audioCache[key] = audio
      // Handle load errors silently
      audio.addEventListener('error', () => {
        // Sound file not available, that's ok
      })
    } catch (e) {
      // Failed to create audio, that's ok
    }
  })
}

// Play a sound
export function playSound(soundName) {
  // CRITICAL: Check mute state FIRST before doing anything
  if (isMuted) {
    console.log('[soundManager] Sound blocked - muted:', soundName)
    return
  }

  // Check sound mode - if standard mode, only play standard sounds
  const currentMode = getSoundMode()
  if (currentMode === 'standard' && !STANDARD_MODE_SOUNDS.includes(soundName)) {
    // Sound is party-only, skip in standard mode
    return
  }

  // Get current sound path (in case theme or mode changed)
  const SOUNDS = buildSoundsObject()
  const url = SOUNDS[soundName]
  
  if (!url) {
    // Sound not found or not available in current mode, skip
    return
  }

  // Check if we have a cached version
  let audio = audioCache[soundName]
  
  // If no cache or URL changed, create new audio
  if (!audio || audio.src !== url) {
    try {
      audio = new Audio(url)
      audio.preload = 'auto'
      audioCache[soundName] = audio
      audio.addEventListener('error', () => {
        // Sound file not available, that's ok
      })
    } catch (e) {
      // Failed to create audio, that's ok
      return
    }
  }

  // Play the sound
  if (audio) {
    try {
      audio.currentTime = 0
      audio.play().catch(() => {
        // Failed to play, that's ok (e.g., autoplay restrictions)
      })
    } catch (e) {
      // Failed to play, that's ok
    }
  }
}

// Toggle mute - this is the key function
export function toggleMute() {
  isMuted = !isMuted
  
  if (isMuted) {
    // Try window direct reference FIRST (most reliable)
    if (window.__wojakBackgroundMusicDirect) {
      try {
        const audio = window.__wojakBackgroundMusicDirect
        audio.pause()
        audio.volume = 0
        audio.muted = true
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Start continuous monitoring to keep audio paused
    if (muteCheckInterval) {
      clearInterval(muteCheckInterval)
    }
    
    muteCheckInterval = setInterval(() => {
      if (!isMuted) {
        clearInterval(muteCheckInterval)
        muteCheckInterval = null
        return
      }
      
      // Continuously pause ALL audio elements
      const allAudios = document.querySelectorAll('audio')
      allAudios.forEach((audio) => {
        if (!audio.paused || audio.volume > 0 || !audio.muted) {
          try {
            audio.pause()
            audio.volume = 0
            audio.muted = true
          } catch (e) {
            // Ignore errors
          }
        }
      })
      
      // Also try window direct reference (most reliable)
      if (window.__wojakBackgroundMusicDirect) {
        const audio = window.__wojakBackgroundMusicDirect
        if (!audio.paused || audio.volume > 0 || !audio.muted) {
          try {
            audio.pause()
            audio.volume = 0
            audio.muted = true
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      // Also check registered reference
      if (backgroundMusic && (!backgroundMusic.paused || backgroundMusic.volume > 0 || !backgroundMusic.muted)) {
        try {
          backgroundMusic.pause()
          backgroundMusic.volume = 0
          backgroundMusic.muted = true
        } catch (e) {
          // Ignore errors
        }
      }
    }, 100) // Check every 100ms
    
    // Pause ALL audio elements immediately
    const allAudios = document.querySelectorAll('audio')
    allAudios.forEach((audio) => {
      try {
        audio.pause()
        audio.volume = 0
        audio.muted = true
        audio.removeAttribute('autoplay')
      } catch (e) {
        // Ignore errors
      }
    })
    
    // Try window direct reference (most reliable)
    if (window.__wojakBackgroundMusicDirect) {
      try {
        const audio = window.__wojakBackgroundMusicDirect
        audio.pause()
        audio.volume = 0
        audio.muted = true
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Also try the registered reference
    if (backgroundMusic) {
      try {
        backgroundMusic.pause()
        backgroundMusic.volume = 0
        backgroundMusic.muted = true
      } catch (e) {
        // Ignore errors
      }
    }
    
    // STOP all cached sound effects
    Object.values(audioCache).forEach(audio => {
      try {
        if (audio && !audio.paused) {
          audio.pause()
          audio.currentTime = 0
        }
      } catch (e) {
        // Ignore errors
      }
    })
  } else {
    // Stop continuous monitoring
    if (muteCheckInterval) {
      clearInterval(muteCheckInterval)
      muteCheckInterval = null
    }
    
    // UNMUTE: Resume background music
    // Find all audio elements and resume the background music one
    const allAudios = document.querySelectorAll('audio')
    allAudios.forEach((audio) => {
      const src = audio.src || audio.getAttribute('src') || ''
      // Only resume if it's the background music (wojakmusic)
      if (src.includes('wojakmusic')) {
        try {
          audio.muted = false
          audio.volume = 0.08
          if (audio.paused) {
            audio.play().catch(() => {
              // Ignore play errors
            })
          }
        } catch (e) {
          // Ignore errors
        }
      }
    })
    
    // Also try window direct reference (most reliable)
    if (window.__wojakBackgroundMusicDirect) {
      try {
        const audio = window.__wojakBackgroundMusicDirect
        audio.muted = false
        audio.volume = 0.08
        if (audio.paused) {
          audio.play().catch(() => {
            // Ignore play errors
          })
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Also try the registered reference
    if (backgroundMusic) {
      try {
        backgroundMusic.muted = false
        backgroundMusic.volume = 0.08
        if (backgroundMusic.paused) {
          backgroundMusic.play().catch(() => {
            // Ignore play errors
          })
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  // Save preference
  try {
    localStorage.setItem('sound_muted', String(isMuted))
    // Dispatch custom event for immediate response (same-window updates)
    window.dispatchEvent(new CustomEvent('muteToggle', { detail: { muted: isMuted } }))
  } catch (e) {
    // Ignore localStorage errors
  }
  
  return isMuted
}

// Get mute state
export function getMuteState() {
  return isMuted
}

// Set mute state (for initializing from localStorage)
export function setMuteState(muted) {
  isMuted = muted
  
  if (isMuted && backgroundMusic) {
    try {
      backgroundMusic.pause()
      backgroundMusic.volume = 0
    } catch (e) {
      // Ignore errors
    }
  } else if (!isMuted && backgroundMusic) {
    try {
      backgroundMusic.volume = 0.08
      if (backgroundMusic.paused) {
        backgroundMusic.play().catch(e => {
          console.log('[soundManager] Music play failed:', e)
        })
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  try {
    localStorage.setItem('sound_muted', String(isMuted))
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Load mute preference on startup
export function loadMutePreference() {
  try {
    const saved = localStorage.getItem('sound_muted')
    if (saved === 'true') {
      isMuted = true
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return isMuted
}
