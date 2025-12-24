import Window from './Window'

export default function FaqWindow({ onClose }) {
  return (
    <Window
      id="window-faq"
      title="FAQ"
      style={{ 
        width: 'var(--window-size-faq)', 
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)'
      }}
      onClose={onClose}
    >
      <p>
        <b>What is this?</b> A handcrafted Wojak NFT collection made for the
        Grove — meme culture, not museum art.
      </p>

      <p>
        <b>Can I use the art?</b> Absolutely! Right-click, save it, turn it
        into a meme, remix it, share it — go wild and make it your own. 😎
      </p>

      <p>
        <b>Where is the mint?</b>{' '}
        <a
          href="https://wojakfarmersplot.crate.ink/#/"
          target="_blank"
              rel="noopener noreferrer"
        >
          Crate.ink
        </a>
        {' '}(Chia).
      </p>
    </Window>
  )
}

