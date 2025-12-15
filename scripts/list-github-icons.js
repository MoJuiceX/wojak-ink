/**
 * Script to list available icons from GitHub repo
 * Run with: node scripts/list-github-icons.js
 */

import https from 'https'

const url = 'https://api.github.com/repos/nestoris/Win98SE/contents/SE98/apps/16'

https.get(url, {
  headers: {
    'User-Agent': 'Node.js'
  }
}, (res) => {
  let data = ''
  
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    try {
      const files = JSON.parse(data)
      console.log('Available icons in SE98/apps/16:')
      console.log('================================')
      files.forEach(file => {
        if (file.type === 'file' && file.name.endsWith('.png')) {
          console.log(`  - ${file.name}`)
        }
      })
    } catch (err) {
      console.error('Error parsing response:', err.message)
      console.log('Raw response:', data.substring(0, 500))
    }
  })
}).on('error', (err) => {
  console.error('Error:', err.message)
})

