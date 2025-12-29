import Window from './Window'

export default function RoadmapWindow({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <Window
      id="roadmap-window"
      title="Wojak_Farmers_Plot_Roadmap.TXT"
      style={{ 
        width: '1175px', 
        maxWidth: 'calc(100vw - 40px)', 
        left: '20px', 
        top: '20px' 
      }}
      onClose={onClose}
      allowScroll={true}
    >
      <div className="readme-content">
        <p>
          <b>This is the roadmap for the Wojak Farmers Plot 🍊</b>
        </p>

        <p>
          It is my vision as the artist of Wojak Farmers Plot Collection — to build lasting utility, generate real revenue through innovative tools and products, and continuously return value directly to NFT holders.
        </p>

        <p>
          The core vision behind this collection is to provide the community with memetic ammunition to create memes. That's one of the core pillars the Tang Gang does best!
        </p>

        <p>
          My commitment is clear: I'm building real products and services, monetizing them, and bring it back to the grove.
        </p>

        <p>
          <b>Here's the plan:</b>
        </p>

        <p>
          Long-term, we've established the Wojak Farmers Plot treasury. 33% of all mint revenue goes straight into it. This treasury will provide liquidity with community CAT tokens and XCH. When the timing is right — once the CATs has outperformed XCH and we've accumulated substantial XCH in the LP pools — we'll deploy that XCH to buy back floor-priced Wojak NFTs, supporting the floor and rewarding holders.
        </p>

        <p>
          In the short term, I've already launched the Wojak_Generator. Soon, it will feature a MINT button, allowing anyone to create and mint their own custom Wojak on the blockchain for a fee. The revenue from this tool will either grow the treasury or be used immediately to sweep floor NFTs.
        </p>

        <p>
          But the real money make imo is the tool I've already hinted at on the website — the Rarity Explorer. It started as a rarity tool, but it's true value is what we will be calling 'The Citrus Value.' It will display real-time trading data for every single trait in the collection, revealing hidden deals and giving you full transparency into what's trading and for how much. You'll be able to analyze your own NFTs, scout the collection, and spot opportunities instantly. This tool will keep the community engaged and active. We'll monetize it thoughtfully, and 100% of the proceeds will go toward buying floor Wojak Farmers Plot NFTs.
        </p>

        <p>
          And that's just the beginning. A merchandise store is already in the works, with many more ideas to follow. This isn't a quick flip for me — this is a long-term mission. I'm running Wojak Farmers Plot like a Fortune 500 company, with real utility, sustained development, and a relentless focus on delivering value back to holders.
        </p>

        <p>
          <b> The Tang Gang is just getting started. Welcome to the Grove 🍊 </b>
        </p>
      </div>
    </Window>
  )
}

