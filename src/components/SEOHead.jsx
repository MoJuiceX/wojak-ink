import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ROUTE_METADATA = {
  '/': {
    title: 'Wojak Farmers Plot — Art for the Grove',
    description: 'Handcrafted NFT art collection for the Grove. 4200 NFTs on Chia blockchain featuring memes, culture, and community.',
    ogImage: 'https://wojak.ink/assets/og.jpg?v=5',
    robots: 'index,follow'
  },
  '/admin-enable': {
    title: 'Admin Panel — Wojak Farmers Plot',
    description: 'Administrative panel for Wojak Farmers Plot.',
    ogImage: 'https://wojak.ink/assets/og.jpg?v=5',
    robots: 'noindex,nofollow'
  },
  '/dev/qa': {
    title: 'QA Testing — Wojak Farmers Plot',
    description: 'Quality assurance testing page.',
    ogImage: 'https://wojak.ink/assets/og.jpg?v=5',
    robots: 'noindex,nofollow'
  }
}

export default function SEOHead() {
  const location = useLocation()
  const metadata = ROUTE_METADATA[location.pathname] || ROUTE_METADATA['/']
  
  useEffect(() => {
    // Update document title
    document.title = metadata.title
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', metadata.description)
    
    // Update robots meta
    let metaRobots = document.querySelector('meta[name="robots"]')
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.setAttribute('name', 'robots')
      document.head.appendChild(metaRobots)
    }
    metaRobots.setAttribute('content', metadata.robots)
    
    // Update Open Graph tags
    const updateOGTag = (property, content) => {
      let ogTag = document.querySelector(`meta[property="${property}"]`)
      if (!ogTag) {
        ogTag = document.createElement('meta')
        ogTag.setAttribute('property', property)
        document.head.appendChild(ogTag)
      }
      ogTag.setAttribute('content', content)
    }
    
    updateOGTag('og:title', metadata.title)
    updateOGTag('og:description', metadata.description)
    updateOGTag('og:image', metadata.ogImage)
    updateOGTag('og:url', `https://wojak.ink${location.pathname}`)
    
    // Update Twitter tags
    const updateTwitterTag = (name, content) => {
      let twitterTag = document.querySelector(`meta[name="${name}"]`)
      if (!twitterTag) {
        twitterTag = document.createElement('meta')
        twitterTag.setAttribute('name', name)
        document.head.appendChild(twitterTag)
      }
      twitterTag.setAttribute('content', content)
    }
    
    updateTwitterTag('twitter:title', metadata.title)
    updateTwitterTag('twitter:description', metadata.description)
    updateTwitterTag('twitter:image', metadata.ogImage)
  }, [location.pathname, metadata])
  
  return null // This component doesn't render anything
}

