import TryAgainWindow from './TryAgainWindow'
import { useOrangeToy } from '../../contexts/OrangeToyContext'

export default function TryAgainWindowWrapper() {
  const { tryAgainOpen, closeTryAgain, claimsCount } = useOrangeToy()

  return (
    <TryAgainWindow
      isOpen={tryAgainOpen}
      claimsCount={claimsCount}
      onClose={closeTryAgain}
    />
  )
}





