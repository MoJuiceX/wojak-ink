import Window from './Window'
import { useEffect, useRef, useState } from 'react'

export default function ChubzWindow({ onClose }) {
  const contentRef = useRef(null)
  const [winWidth, setWinWidth] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const compute = () => {
      // Don't recalculate during drag to prevent layout shifts
      const windowEl = el.closest('.window')
      if (windowEl && windowEl.classList.contains('dragging')) {
        return
      }

      // On mobile, always use full width
      if (window.innerWidth <= 640) {
        setWinWidth(null) // Let CSS handle full width on mobile
        return
      }

      const contentW = el.scrollWidth
      const padding = 40 // window inner padding + borders buffer
      const maxW = Math.min(900, window.innerWidth - 80) // clamp for desktop
      const minW = 420

      const target = Math.max(minW, Math.min(maxW, contentW + padding))
      setWinWidth(target)
    }

    compute()

    // Recompute on resize (and after fonts/layout changes via resize)
    // Use debounce to prevent excessive recalculations
    let resizeTimeout
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640)
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(compute, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Ensure scrollbar is always visible (Windows 98 behavior)
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
    }

    // Force immediately - don't wait
    forceHeightConstraint()

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
    const ensureScrollbar = () => {
      windowBody.style.overflowY = 'scroll'
      
      // Force scrollbar by doing a tiny scroll manipulation
      const currentScroll = windowBody.scrollTop
      windowBody.scrollTop = 0.5
      requestAnimationFrame(() => {
        windowBody.scrollTop = 0
      })
    }

    // Use ResizeObserver to detect when window-body is ready
    const resizeObserver = new ResizeObserver(() => {
      forceHeightConstraint()
      requestAnimationFrame(() => {
        ensureScrollbar()
      })
    })
    
    resizeObserver.observe(windowBody)
    if (windowEl) {
      resizeObserver.observe(windowEl)
    }

    // Force multiple times to catch all cases
    requestAnimationFrame(() => {
      forceHeightConstraint()
      ensureScrollbar()
      requestAnimationFrame(() => {
        forceHeightConstraint()
        ensureScrollbar()
      })
    })
    
    const timeout1 = setTimeout(() => {
      forceHeightConstraint()
      ensureScrollbar()
    }, 10)
    const timeout2 = setTimeout(() => {
      forceHeightConstraint()
      ensureScrollbar()
    }, 50)
    const timeout3 = setTimeout(() => {
      forceHeightConstraint()
      ensureScrollbar()
    }, 150)
    
    return () => {
      resizeObserver.disconnect()
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
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
        position: 'relative',
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
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img 
            src="/assets/images/chubz-banner.jpeg" 
            alt="The Bitcoin Killer - Proof of Space and Time" 
            style={{ 
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              border: '1px solid var(--border-dark)',
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

