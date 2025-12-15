/**
 * Script to list available icons from GitHub API
 * Run with: node scripts/list-available-icons.js
 */

import https from 'https'

const sizes = ['16', '32', 'scalable']
const baseUrl = 'https://api.github.com/repos/nestoris/Win98SE/contents/SE98/apps'

function listFiles(size) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/${size}`
    
    https.get(url, {
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const files = JSON.parse(data)
          resolve(files)
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', reject).setTimeout(10000, () => {
      reject(new Error('Timeout'))
    })
  })
}

async function main() {
  console.log('Fetching available icons from GitHub...\n')
  
  for (const size of sizes) {
    try {
      console.log(`\n=== ${size.toUpperCase()} ===`)
      const files = await listFiles(size)
      const iconFiles = files
        .filter(f => f.type === 'file' && (f.name.endsWith('.png') || f.name.endsWith('.svg')))
        .map(f => f.name)
        .sort()
      
      if (iconFiles.length > 0) {
        iconFiles.forEach(name => console.log(`  - ${name}`))
      } else {
        console.log('  (no files found)')
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`)
    }
  }
}

main().catch(console.error)


