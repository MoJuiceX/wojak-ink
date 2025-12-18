import Window from './Window'

export default function TangGangWindow({ onClose }) {
  return (
    <Window
      id="tanggang"
      title="🍊 TangGang"
      icon={null}
      noStack={true}
      style={{ 
        // Don't set left/top - let centerOnOpen handle positioning
        width: 'var(--window-size-tanggang)',
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)',
        minHeight: '300px', // Stable height for accurate centering
        height: 'auto'
      }}
      onClose={onClose}
    >
      <img
        src="https://bafybeihbaqn7omk55qi3vfrht76qa53kz4dx75anzwtjkcggi2v3jql4tm.ipfs.w3s.link/?filename=HOA+logo.png"
        alt="TangGang"
        className="fit-img"
      />
    </Window>
  )
}

