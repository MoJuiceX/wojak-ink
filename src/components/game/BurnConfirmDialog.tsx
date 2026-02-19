import { useState } from 'react';

const BURN_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy';

interface BurnConfirmDialogProps {
  nftName: string;
  editionNumber: number;
  likes: number;
  dislikes: number;
  estimatedCredits: number;
  onConfirm: () => void;
  onCancel: () => void;
  burning: boolean;
}

export function BurnConfirmDialog({
  nftName, editionNumber, likes, dislikes, estimatedCredits,
  onConfirm, onCancel, burning,
}: BurnConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'var(--color-black-80)' }}>
      <div className="card-static p-6 max-w-md w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold text-error">
          Burn {nftName}?
        </h2>

        <div className="flex flex-col gap-2 text-sm">
          <p className="text-secondary">
            This action is <strong>permanent and irreversible</strong>.
            Your Wojak #{editionNumber} will be destroyed forever.
          </p>
          <div className="flex justify-between">
            <span className="text-secondary">Votes:</span>
            <span>{likes} likes / {dislikes} dislikes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Credits earned:</span>
            <span className="text-accent font-bold">{(estimatedCredits / 100).toFixed(0)} credits</span>
          </div>
          <p className="text-xs text-muted">
            Burn address: {BURN_ADDRESS.slice(0, 20)}...
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I understand this cannot be undone
        </label>

        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onCancel} disabled={burning}>
            Cancel
          </button>
          <button
            className="btn flex-1 text-white"
            style={{ background: 'var(--color-error)' }}
            onClick={onConfirm}
            disabled={!confirmed || burning}
          >
            {burning ? 'Burning...' : 'Burn Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
