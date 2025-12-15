import Window from './Window'

export default function ReadmeWindow() {
  return (
    <Window
      title="README.TXT"
      style={{ width: '820px', maxWidth: 'calc(100vw - 40px)', left: '20px', top: '20px' }}
    >
      <div className="banner">
        <img
          src="https://bafybeihnxg76ikdnqmenuabfyujgsrrdiqek2fmmhbnjy4y35bd633thma.ipfs.w3s.link/Wojak%20Farmers%20Plot%20Banner%202.png"
          alt="Wojak Farmers Plot banner"
        />
      </div>

      <div style={{
        padding: '8px',
        marginBottom: '12px',
        backgroundColor: '#ffffcc',
        border: '1px solid #c0c0c0',
        fontSize: '11px'
      }}>
        <b>💡 Tip:</b> Use the <b>Start Menu</b> or <b>Taskbar</b> to open more windows and explore the collection!
      </div>

      <p>
        <b>Wojak Farmers Plot — Art for the Grove</b>
      </p>
      <p>
        Wojak Farmers Plot is my personal contribution to TangGang culture — a
        collection built from my journey inside this community. These NFTs are
        handcrafted one by one, made with intention, humour, and a lot of love
        for the culture we're all building together.
      </p>

      <p>
        The art explores many different sides of crypto culture. Some pieces are
        playful, some are more cyberpunk, some are pure meme energy — but every
        single NFT tells a story. And they're meant to be used. Meme them.
        Screenshot them. Right-click save them. That's the point. Memes are
        cultural weapons, and this collection gives the community more tools to
        express this. This is my way of adding to the lore of the TangGang.
      </p>

      <p>
        <b>The goal is simple:</b>
        <br />
        Create art, share it with the gang, and bring it back to the grove. This
        is how we build user aligned incentives.
      </p>

      <ul>
        <li>
          <b>Supply:</b> 4200
        </li>
        <li>
          <b>Chain:</b>{' '}
          <a href="https://www.chia.net/" target="_blank" rel="noreferrer">
            Chia.net
          </a>
        </li>
        <li>
          <b>Mint:</b> Friday Dec 19th, 2025
        </li>
      </ul>

      <hr />

      <p>
        <b>Marketplace</b>
      </p>
      <p>
        View the collection on Crate:
        <a
          href="https://crate.ink/#/collection-detail/WOJAKFARMERSPLOT"
          target="_blank"
          rel="noreferrer"
        >
          https://crate.ink/#/collection-detail/WOJAKFARMERSPLOT
        </a>
      </p>

      <p>
        <b>X / Twitter</b>
      </p>
      <p>
        Follow updates here:
        <a href="https://x.com/MoJuiceX" target="_blank" rel="noreferrer">
          https://x.com/MoJuiceX
        </a>
      </p>

      <hr />
    </Window>
  )
}

