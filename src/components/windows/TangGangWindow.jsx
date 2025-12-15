import Window from './Window'

export default function TangGangWindow() {
  return (
    <Window
      title="TangGang"
      noStack={true}
      style={{ left: '0px', top: '0px' }}
    >
      <img
        src="https://bafybeihbaqn7omk55qi3vfrht76qa53kz4dx75anzwtjkcggi2v3jql4tm.ipfs.w3s.link/?filename=HOA+logo.png"
        alt="TangGang"
        className="fit-img"
      />
    </Window>
  )
}

