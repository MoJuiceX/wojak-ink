import Window from './Window'
import { useState } from 'react'
import { Skeleton } from '../ui'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'

const GALLERY_ITEMS = [
  { title: 'Wojak', front: '0001.png', back: '0579.png', label: 'Wojak #0001' },
  { title: 'Wojak', front: '0768.png', back: '0797.png', label: 'Wojak #0768' },
  { title: 'Wojak', front: '0807.png', back: '1725.png', label: 'Wojak #0807' },
  { title: 'Wojak', front: '1527.png', back: '1553.png', label: 'Wojak #1527' },
  { title: 'Soyjak', front: '2201.png', back: '2750.png', label: 'Wojak #2201' },
  { title: 'Soyjak', front: '2506.png', back: '2489.png', label: 'Wojak #2506' },
  { title: 'Soyjak', front: '2529.png', back: '2547.png', label: 'Wojak #2529' },
  { title: 'Soyjak', front: '2652.png', back: '2667.png', label: 'Wojak #2652' },
  { title: 'Waifu', front: '2926.png', back: '2987.png', label: 'Wojak #2926' },
  { title: 'Waifu', front: '2974.png', back: '2832.png', label: 'Wojak #2974' },
  { title: 'Baddie', front: '3139.png', back: '3085.png', label: 'Wojak #3139' },
  { title: 'Baddie', front: '3161.png', back: '3018.png', label: 'Wojak #3161' },
  { title: 'Papa Tang', front: '3262.png', back: '3441.png', label: 'Wojak #3262' },
  { title: 'Papa Tang', front: '3340.png', back: '3365.png', label: 'Wojak #3340' },
  { title: 'Monkey Zoo', front: '3499.png', back: '3640.png', label: 'Wojak #3499' },
  { title: 'Monkey Zoo', front: '3627.png', back: '3473.png', label: 'Wojak #3627' },
  { title: 'Alien Wojak', front: '3705.png', back: '3653.png', label: 'Wojak #3705' },
  { title: 'Alien Soyjak', front: '3794.png', back: '3738.png', label: 'Wojak #3794' },
  { title: 'Alien Waifu', front: '3842.png', back: '3845.png', label: 'Wojak #3842' },
  { title: 'Alien Baddie', front: '3885.png', back: '3899.png', label: 'Wojak #3885' },
  { title: 'Bepe Wojak', front: '3953.png', back: '3989.png', label: 'Wojak #3953' },
  { title: 'Bepe Soyjak', front: '4093.png', back: '4096.png', label: 'Wojak #4093' },
  { title: 'Bepe Waifu', front: '4124.png', back: '4172.png', label: 'Wojak #4124' },
  { title: 'Bepe Baddie', front: '4167.png', back: '4184.png', label: 'Wojak #4167' },
]

const BASE_URL = 'https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/'

function GalleryThumb({ item }) {
  const [frontSrc, setFrontSrc] = useState(`${BASE_URL}${item.front}`)
  const [backSrc, setBackSrc] = useState(`${BASE_URL}${item.back}`)
  const [frontAttempted, setFrontAttempted] = useState(false)
  const [backAttempted, setBackAttempted] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const [frontLoading, setFrontLoading] = useState(true)
  const [backLoading, setBackLoading] = useState(true)
  const [frontError, setFrontError] = useState(false)
  const [backError, setBackError] = useState(false)
  const { elementRef, hasIntersected } = useIntersectionObserver()

  const handleFrontError = () => {
    setFrontLoading(false)
    setFrontError(true)
    if (!frontAttempted) {
      setFrontAttempted(true)
      const match = frontSrc.match(/(\d+)(\.png)(\?.*)?$/)
      if (match) {
        const original = match[1]
        const altNum = String(parseInt(original, 10) + 1).padStart(original.length, '0')
        setFrontSrc(frontSrc.replace(original, altNum))
        setFrontError(false)
        setFrontLoading(true)
        return
      }
    }
  }

  const handleBackError = () => {
    setBackLoading(false)
    setBackError(true)
    if (!backAttempted) {
      setBackAttempted(true)
      const match = backSrc.match(/(\d+)(\.png)(\?.*)?$/)
      if (match) {
        const original = match[1]
        const altNum = String(parseInt(original, 10) + 1).padStart(original.length, '0')
        setBackSrc(backSrc.replace(original, altNum))
        setBackError(false)
        setBackLoading(true)
        return
      }
    }
    // Fallback to front image
    setBackSrc(frontSrc)
    setBackError(false)
    setBackLoading(true)
  }

  const handleFrontLoad = () => {
    setFrontLoading(false)
    setFrontError(false)
  }

  const handleBackLoad = () => {
    setBackLoading(false)
    setBackError(false)
  }

  return (
    <div 
      ref={elementRef}
      className="thumb" 
      data-title={item.title} 
      aria-label={item.label}
      onMouseEnter={() => setShowLabel(true)}
      onMouseLeave={() => setShowLabel(false)}
      onTouchStart={() => setShowLabel(true)}
      onTouchEnd={() => setTimeout(() => setShowLabel(false), 2000)}
      style={{ position: 'relative' }}
    >
      {(frontLoading || backLoading) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}>
          <Skeleton width="100%" height="100%" />
        </div>
      )}
      {!frontError && (
        <img
          className="img front"
          src={hasIntersected ? frontSrc : undefined}
          alt={item.label}
          loading="lazy"
          decoding="async"
          onError={handleFrontError}
          onLoad={handleFrontLoad}
          style={{ opacity: frontLoading ? 0 : 1, transition: 'opacity 0.3s' }}
        />
      )}
      {!backError && (
        <img
          className="img back"
          src={hasIntersected ? backSrc : undefined}
          alt={item.label}
          loading="lazy"
          decoding="async"
          onError={handleBackError}
          onLoad={handleBackLoad}
          style={{ opacity: backLoading ? 0 : 1, transition: 'opacity 0.3s' }}
        />
      )}
      {(frontError && backError) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '9px',
          color: '#666',
          textAlign: 'center',
        }}>
          Failed to load
        </div>
      )}
      {showLabel && (
        <div className="gallery-label">
          {item.title}
        </div>
      )}
    </div>
  )
}

export default function GalleryWindow() {
  return (
    <Window
      title="GALLERY"
      style={{ width: '1200px', maxWidth: 'calc(100vw - 40px)', left: '20px', top: '920px' }}
    >
      <div className="grid gallery-grid" role="grid" aria-label="Gallery of Wojak NFTs">
        {GALLERY_ITEMS.map((item, index) => (
          <GalleryThumb key={index} item={item} />
        ))}
      </div>
      <p className="fineprint">Random previews from the collection.</p>
    </Window>
  )
}
