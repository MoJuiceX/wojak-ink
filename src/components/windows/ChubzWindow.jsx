import Window from './Window'
import { useEffect, useRef, useState } from 'react'

export default function ChubzWindow({ onClose }) {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChubzWindow.jsx:4',message:'ChubzWindow mounted',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    
    // Track viewport/scroll position changes to identify layout shifts
    const checkPositions = (label) => {
      const desktopIconsContainer = document.querySelector('.desktop-image-icons-container');
      const desktopContainer = document.querySelector('.desktop');
      const desktopWrapper = document.querySelector('.desktop')?.parentElement;
      const windowEl = document.querySelector('#window-chia-network');
      const bodyEl = document.body;
      const htmlEl = document.documentElement;
      
      const result = { 
        label,
        viewport: {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight
        }
      };
      
      if (bodyEl) {
        const bodyStyles = window.getComputedStyle(bodyEl);
        const bodyRect = bodyEl.getBoundingClientRect();
        result.body = {
          overflow: bodyStyles.overflow,
          position: bodyStyles.position,
          top: bodyRect.top,
          left: bodyRect.left,
          scrollTop: bodyEl.scrollTop,
          scrollLeft: bodyEl.scrollLeft
        };
      }
      
      if (htmlEl) {
        const htmlStyles = window.getComputedStyle(htmlEl);
        result.html = {
          overflow: htmlStyles.overflow,
          position: htmlStyles.position,
          scrollTop: htmlEl.scrollTop,
          scrollLeft: htmlEl.scrollLeft
        };
      }
      
      if (desktopIconsContainer) {
        const rect = desktopIconsContainer.getBoundingClientRect();
        const styles = window.getComputedStyle(desktopIconsContainer);
        result.desktopIcons = {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        };
      }
      
      if (desktopContainer) {
        const rect = desktopContainer.getBoundingClientRect();
        const styles = window.getComputedStyle(desktopContainer);
        result.desktop = {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        };
      }
      
      if (desktopWrapper) {
        const rect = desktopWrapper.getBoundingClientRect();
        const styles = window.getComputedStyle(desktopWrapper);
        result.desktopWrapper = {
          zIndex: styles.zIndex,
          position: styles.position,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        };
      }
      
      if (windowEl) {
        const rect = windowEl.getBoundingClientRect();
        const styles = window.getComputedStyle(windowEl);
        result.window = {
          display: styles.display,
          position: styles.position,
          zIndex: styles.zIndex,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        };
      }
      
      const readmeWindow = document.querySelector('#window-readme-txt');
      if (readmeWindow) {
        const rect = readmeWindow.getBoundingClientRect();
        const styles = window.getComputedStyle(readmeWindow);
        result.readmeWindow = {
          display: styles.display,
          position: styles.position,
          zIndex: styles.zIndex,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right
        };
      }
      
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChubzWindow.jsx:10',message:`Position check: ${label}`,data:result,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'R'})}).catch(()=>{});
    };
    
    // Monitor scroll events to detect viewport shifts
    const handleScroll = () => {
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChubzWindow.jsx:scroll',message:'Page scroll detected',data:{scrollX:window.scrollX,scrollY:window.scrollY,bodyScrollTop:document.body.scrollTop,htmlScrollTop:document.documentElement.scrollTop},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'R'})}).catch(()=>{});
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check before mount completes
    checkPositions('before mount');
    
    // Check after mount
    setTimeout(() => checkPositions('after 100ms'), 100);
    setTimeout(() => checkPositions('after 500ms'), 500);
    setTimeout(() => checkPositions('after 1000ms'), 1000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  // #endregion
  
  const contentRef = useRef(null)
  const [winWidth, setWinWidth] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const isCalculatingWidthRef = useRef(false)

  // Defer width calculation until after initial mount to prevent layout shifts
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const compute = () => {
      // Don't recalculate during drag to prevent layout shifts
      const windowEl = el.closest('.window')
      if (windowEl && windowEl.classList.contains('dragging')) {
        return
      }

      // Prevent multiple simultaneous calculations
      if (isCalculatingWidthRef.current) return
      isCalculatingWidthRef.current = true

      // On mobile, always use full width
      if (window.innerWidth <= 640) {
        setWinWidth(null) // Let CSS handle full width on mobile
        isCalculatingWidthRef.current = false
        return
      }

      // Use requestAnimationFrame to batch the layout read and prevent causing reflow
      requestAnimationFrame(() => {
        // Only read layout after ensuring window is positioned
        const contentW = el.scrollWidth
        const padding = 40 // window inner padding + borders buffer
        const maxW = Math.min(900, window.innerWidth - 80) // clamp for desktop
        const minW = 420

        const target = Math.max(minW, Math.min(maxW, contentW + padding))
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChubzWindow.jsx:161',message:'ChubzWindow compute width',data:{contentW,innerWidth:window.innerWidth,target,scrollY:window.scrollY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'S'})}).catch(()=>{});
        // #endregion
        setWinWidth(target)
        isCalculatingWidthRef.current = false
      })
    }

    // Defer initial calculation significantly to avoid interfering with other windows during mount
    // Use longer delay to ensure window positioning is complete and stable
    const scheduleCompute = () => {
      // Wait for window to be positioned and all other windows to settle
      if ('requestIdleCallback' in window) {
        requestIdleCallback(compute, { timeout: 1000 })
      } else {
        // Use longer delay to ensure window positioning completes first
        setTimeout(compute, 500)
      }
    }

    scheduleCompute()

    // Recompute on resize (and after fonts/layout changes via resize)
    // Use debounce to prevent excessive recalculations
    let resizeTimeout
    const handleResize = () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChubzWindow.jsx:169',message:'ChubzWindow resize handler fired',data:{innerWidth:window.innerWidth,innerHeight:window.innerHeight,scrollY:window.scrollY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'S'})}).catch(()=>{});
      // #endregion
      setIsMobile(window.innerWidth <= 640)
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(compute, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
      isCalculatingWidthRef.current = false
    }
  }, [])

  // Ensure scrollbar is always visible (Windows 98 behavior)
  // Use ref to track scrollbar state across remounts to prevent multiple scroll manipulations
  const scrollbarEnsuredRef = useRef(false)
  
  useEffect(() => {
    const contentEl = contentRef.current
    if (!contentEl) return

    const windowEl = contentEl.closest('.window')
    const windowBody = windowEl?.querySelector('.window-body.scroll-allowed')
    if (!windowBody) return

    // CRITICAL: Force height constraint immediately to ensure scrollbar appears
    // This ensures the window-body is constrained from the start
    const forceHeightConstraint = () => {
      // Ensure the window is a flex container (should be in CSS, but force it)
      if (windowEl) {
        windowEl.style.display = 'flex'
        windowEl.style.flexDirection = 'column'
      }
      
      // Force height: 0 on window-body (flex trick to make it respect max-height)
      windowBody.style.height = '0'
      windowBody.style.overflowY = 'scroll'
      windowBody.style.flex = '1 1 0%'
      windowBody.style.minHeight = '0'
      windowBody.style.maxHeight = '100%'
      // Ensure window-body scroll doesn't affect page scroll or layout
      windowBody.style.overscrollBehavior = 'contain'
      // Use layout containment only to prevent layout shifts but allow content rendering
      windowBody.style.contain = 'layout'
      // Additional isolation to prevent layout propagation
      windowBody.style.isolation = 'isolate'
      // Prevent scroll chaining
      windowBody.style.overscrollBehaviorY = 'contain'
    }

    // Don't force immediately - defer to avoid causing layout shifts during mount
    // The window should be positioned first before we manipulate its internal layout

    // Add a tiny invisible spacer at the end of content to ensure there's always overflow
    let spacer = contentEl.querySelector('.scrollbar-spacer')
    if (!spacer) {
      spacer = document.createElement('div')
      spacer.className = 'scrollbar-spacer'
      spacer.style.height = '1px'
      spacer.style.visibility = 'hidden'
      spacer.style.pointerEvents = 'none'
      spacer.style.marginTop = '1px'
      contentEl.appendChild(spacer)
    }

    // Force scrollbar to appear by doing a tiny scroll
    // Only run scroll manipulation once across all remounts using ref
    const ensureScrollbar = () => {
      try {
        if (scrollbarEnsuredRef.current) {
          // Already ensured, just set overflow
          windowBody.style.overflowY = 'scroll'
          return
        }
        
        // CRITICAL: Ensure windowBody is contained and isolated before any manipulation
        if (!windowBody || !document.body.contains(windowBody)) return
        
        // Store page scroll position BEFORE any manipulation to prevent layout shifts
        const pageScrollY = window.scrollY
        const pageScrollX = window.scrollX
        
        // Ensure windowBody is completely isolated from page layout
        windowBody.style.overflowY = 'scroll'
        windowBody.style.overscrollBehavior = 'contain'
        windowBody.style.isolation = 'isolate'
        
        // Mark as ensuring to prevent multiple simultaneous calls
        scrollbarEnsuredRef.current = true
        
        // Use will-change to hint browser to isolate this element from page layout
        windowBody.style.willChange = 'scroll-position'
        
        // Delay scroll manipulation to avoid interfering with initial layout
        // Use longer delay to ensure other windows have finished mounting
        setTimeout(() => {
          requestAnimationFrame(() => {
            // Only manipulate if still mounted and body still exists
            if (!windowBody || !document.body.contains(windowBody)) {
              scrollbarEnsuredRef.current = false
              return
            }
            
            try {
              const beforeScroll = windowBody.scrollTop
              // Use requestAnimationFrame to ensure this happens after layout
              requestAnimationFrame(() => {
                if (!windowBody || !document.body.contains(windowBody)) {
                  scrollbarEnsuredRef.current = false
                  return
                }
                
                try {
                  // Tiny scroll to trigger scrollbar
                  windowBody.scrollTop = 0.5
                  
                  requestAnimationFrame(() => {
                    if (!windowBody || !document.body.contains(windowBody)) {
                      scrollbarEnsuredRef.current = false
                      return
                    }
                    
                    try {
                      windowBody.scrollTop = 0
                      windowBody.style.willChange = 'auto'
                      
                      // CRITICAL: Ensure page scroll position didn't change
                      // Restore immediately if it changed, with no visual delay
                      if (window.scrollY !== pageScrollY || window.scrollX !== pageScrollX) {
                        // Use scrollTo with instant behavior to prevent any visual shift
                        window.scrollTo({ left: pageScrollX, top: pageScrollY, behavior: 'instant' })
                      }
                      
                      // #region agent log
                      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChubzWindow.jsx:186',message:'ChubzWindow scroll reset',data:{afterScrollTop:windowBody.scrollTop,beforeScroll,pageScrollY:window.scrollY,pageScrollX:window.scrollX},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Q'})}).catch(()=>{});
                      // #endregion
                    } catch (e) {
                      console.error('[ChubzWindow] Error in scrollbar reset:', e)
                      scrollbarEnsuredRef.current = false
                    }
                  })
                } catch (e) {
                  console.error('[ChubzWindow] Error setting scrollTop:', e)
                  scrollbarEnsuredRef.current = false
                }
              })
            } catch (e) {
              console.error('[ChubzWindow] Error in scrollbar manipulation:', e)
              scrollbarEnsuredRef.current = false
            }
          })
        }, 100) // Increased delay to avoid interfering with other windows
      } catch (e) {
        console.error('[ChubzWindow] Error in ensureScrollbar:', e)
        scrollbarEnsuredRef.current = false
      }
    }

    // Use ResizeObserver to detect when window-body is ready
    // Throttle ResizeObserver to prevent excessive layout thrashing
    let resizeTimeout = null
    let lastResizeTime = 0
    const RESIZE_THROTTLE_MS = 300 // Increased throttle to prevent interfering with other windows
    
    // Flag to prevent ResizeObserver from running during initial mount
    let isInitialMount = true
    setTimeout(() => {
      isInitialMount = false
    }, 500) // Wait 500ms after mount before allowing ResizeObserver to trigger
    
    const resizeObserver = new ResizeObserver((entries) => {
      // Skip during initial mount to prevent layout shifts
      if (isInitialMount) return
      
      const now = Date.now()
      const timeSinceLastResize = now - lastResizeTime
      
      // Clear any pending resize
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      
      // If enough time has passed, run immediately; otherwise throttle
      if (timeSinceLastResize >= RESIZE_THROTTLE_MS) {
        lastResizeTime = now
        forceHeightConstraint()
        requestAnimationFrame(() => {
          // Delay scrollbar manipulation to avoid layout shifts
          setTimeout(() => {
            ensureScrollbar()
          }, 50)
        })
      } else {
        // Throttle: wait until the throttle period has elapsed
        resizeTimeout = setTimeout(() => {
          lastResizeTime = Date.now()
          forceHeightConstraint()
          requestAnimationFrame(() => {
            setTimeout(() => {
              ensureScrollbar()
            }, 50)
          })
        }, RESIZE_THROTTLE_MS - timeSinceLastResize)
      }
    })
    

    // Defer all operations to avoid interfering with initial mount and other windows
    // Use longer delay to ensure other windows have finished their positioning
    const deferredInit = () => {
      // Wait for window to be fully positioned and stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Apply height constraint after positioning is stable
          forceHeightConstraint()
          // Defer scrollbar manipulation even further
          setTimeout(() => {
            requestAnimationFrame(() => {
              ensureScrollbar()
            })
          }, 300)
        })
      })
    }
    
    // Start deferred initialization after window is positioned and other windows are stable
    // Longer delay ensures no interference with other window positioning
    const deferredInitTimeout = setTimeout(deferredInit, 300)
    
    // Store the observer setup timeout for cleanup
    let observerSetupTimeout = null
    if (windowBody || windowEl) {
      observerSetupTimeout = setTimeout(() => {
        if (windowBody && document.body.contains(windowBody)) {
          resizeObserver.observe(windowBody)
        }
        if (windowEl && document.body.contains(windowEl)) {
          resizeObserver.observe(windowEl)
        }
      }, 500)
    }
    
    return () => {
      resizeObserver.disconnect()
      clearTimeout(deferredInitTimeout)
      if (observerSetupTimeout) {
        clearTimeout(observerSetupTimeout)
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      // Reset scrollbar ensured flag so it can be re-ensured if window reopens
      scrollbarEnsuredRef.current = false
    }
  }, [])

  return (
    <Window
      id="window-chia-network"
      title="@chubzxmeta"
      icon="/assets/images/chubz.jpg"
      allowScroll={true}
      style={{
        ...(isMobile ? {
          // Mobile: full width, proper height
          width: '100%',
          maxWidth: '100%',
          minWidth: '100%',
          height: '100%',
          minHeight: '100%',
        } : {
          width: winWidth ? `${winWidth}px` : 'auto',
          maxWidth: 'min(900px, calc(100vw - 80px))',
          minWidth: '420px',
          minHeight: '500px', // Minimum height for ChubzWindow
        }),
        // Use absolute positioning (default) instead of relative to ensure proper stacking
        // position: 'relative' was causing desktop icons to disappear
        position: 'absolute',
        // Use layout containment to isolate from document layout (allows images to render)
        contain: 'layout', // Isolate layout changes but allow images/paint to work
        isolation: 'isolate', // Create new stacking context to prevent layout propagation
      }}
      onClose={onClose}
    >
      <div
        ref={contentRef}
        className="readme-content"
        style={{
          display: 'block',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px', contain: 'layout' }}>
          <img 
            src="/assets/images/chubz-banner.jpeg" 
            alt="The Bitcoin Killer - Proof of Space and Time" 
            style={{ 
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              border: '1px solid var(--border-dark)',
              contain: 'layout', // Allow image to render while containing layout
            }} 
          />
        </div>

        <p>
          <b>The Green Blockchain Alternative: Chia Network</b>
        </p>

        <p>
          In the crypto space, energy consumption has always been the elephant in the room. BTC and other networks constantly face scrutiny for their massive energy consumption. Chia network (XCH) is changing the narrative that looks less like a powerplant and more like a hard drive.
        </p>

        <p>
          Founded by the same person who founded BitTorrent, Bram Cohen. Chia represents a fundamental shift in how blockchains are secured. Replacing the standard energy intensive mining for a more storage based farming method, it aims to achieve a decentralized secure, environmentally sustainable financial system.
        </p>

        <p>
          The core innovation is its consensus mechanism, known as proof of space and time or PoST. Crypto like BTC use proof of work, which is secure but also consumes way more energy than it should.
        </p>

        <p>
          <b>Chia is approaching it a little different</b>
        </p>

        <p>
          <b>Proof of space:</b> Instead of burning electricity, farmers instead allocate unused hard drive space to the network. The space is filled plots. When the network needs to verify a transaction, the lottery system kicks in awarding the farmer with the matching block!
        </p>

        <p>
          <b>Proof of time:</b> For consistency and security, a Verifiable Delay Function is put in place. Preventing attackers from manipulating the system, even with infinite computing power.
        </p>

        <p>
          The results are a network secured by storage capacity over energy burning. Making it accessible to anyone with a laptop and external hard drive.
        </p>

        <p>
          <b>The Role of Chialisp</b>
        </p>

        <p>
          Being green is Chia's headliner, but its technical spine is just as ambitious. Relying on its own custom built smart contract language called Chialisp.
        </p>

        <p>
          Unlike Solidity, which is prone to high profile hacks and bugs in DeFi. Chialisp was made for auditability and security, prioritizing the safety of assets. Aiming to make Chia the go to blockchain for government and high stake applications.
        </p>

        <p>
          This year was a big year for Chia, moving from a technological experiment to integrating global infrastructure on chain.
        </p>

        <p>
          It made confidential fillings with the SEC proving that Chias intent to operate with transparency and compliance is something we've rarely seen in the crypto space.
        </p>

        <p>
          Its partnerships with the World Banks of China and Singapore are allowing Chia to tokenize and track carbon credits. Ensuring these credits aren't miscounted, contributing to solving a major pain point when it comes to assisting in the fight against climate change.
        </p>

        <p>
          Chia released a cloud wallet and a vault system, allowing users to securely buy and hold XCH directly through ACH transfers. No more CEX fees and spread. You can buy direct from the foundation.
        </p>

        <p>
          In my opinion Chia is positioning itself to be the mature adult we needed in the crypto space. It's sustainable, compliant, and focused on enterprise utility. Giving us a glimpse of what a cleaner, more practical blockchain future could look like.
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-caption)', marginTop: '16px' }}>
          1:55 PM · Dec 27, 2025
        </p>

        <p style={{ marginTop: '16px' }}>
          <a
            href="https://x.com/chubzxmeta/status/2004914142583353382"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-link, var(--link))' }}
          >
            View original post
          </a>
        </p>
      </div>
    </Window>
  )
}

