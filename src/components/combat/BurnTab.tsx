/**
 * Burn Tab - Fight Club
 * Allows users to burn low-power Wojaks for credits.
 * TODO: Implement full UI in Task 4
 */

import { Flame } from 'lucide-react';

export default function BurnTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="p-4 rounded-full" style={{ background: 'var(--color-error-15)' }}>
        <Flame size={32} className="text-error" />
      </div>
      <h2 className="text-xl font-bold">Burn Tab</h2>
      <p className="text-secondary text-center max-w-md">
        Coming soon: Burn your lowest-power Wojaks to earn credits.
      </p>
    </div>
  );
}
