import Window from './Window'

export default function TangGangWindow() {
  return (
    <Window
      id="tanggang"
      title="🍊 TangGang"
      icon={null}
      noStack={true}
      style={{ 
        left: '860px', // Positioned next to README.TXT (20px + 820px + 20px gap)
        top: '20px',
        width: 'var(--window-size-tanggang)',
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)',
        height: 'auto'
      }}
    >
      <img
        src="https://bafybeihbaqn7omk55qi3vfrht76qa53kz4dx75anzwtjkcggi2v3jql4tm.ipfs.w3s.link/?filename=HOA+logo.png"
        alt="TangGang"
        className="fit-img"
      />
    </Window>
  )
}

