// "How Ranking Works" modal — reusable across Rankings + Vote screen.
// Keyboard accessible, focus-managed, close on Escape/backdrop click.

import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface RankingRulesModalProps {
    onClose: () => void;
}

export function RankingRulesModal({ onClose }: RankingRulesModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    // Focus trap + escape
    useEffect(() => {
        closeRef.current?.focus();
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleBackdrop = useCallback((e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    }, [onClose]);

    return (
        <div
            ref={overlayRef}
            className="rules-modal-overlay"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label="How Ranking Works"
        >
            <div className="rules-modal">
                <div className="rules-modal-header">
                    <h3 className="rules-modal-title">How Ranking Works</h3>
                    <button
                        ref={closeRef}
                        type="button"
                        className="rules-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="rules-modal-body">
                    <div className="rules-section">
                        <h4 className="rules-section-title">Voting</h4>
                        <ul className="rules-list">
                            <li><strong>Glaze</strong> = <span className="text-success">+1</span> Vote Score</li>
                            <li><strong>Fade</strong> = <span className="text-error">−1</span> Vote Score</li>
                            <li><strong>Wojak Vote Score</strong> = Glazes − Fades</li>
                        </ul>
                    </div>

                    <div className="rules-section">
                        <h4 className="rules-section-title">Eligibility</h4>
                        <ul className="rules-list">
                            <li>Wojaks need <strong>3 votes</strong> to become <em>Ranked</em></li>
                            <li>Until then, they&apos;re <em>Rising</em> and won&apos;t count toward Player Score</li>
                        </ul>
                    </div>

                    <div className="rules-section">
                        <h4 className="rules-section-title">Player Score</h4>
                        <ul className="rules-list">
                            <li><strong>Player Score</strong> = sum of your top 10 eligible Wojak scores in your DID</li>
                            <li>Only verified Players (Farmers Plot + DID) appear on the Players leaderboard</li>
                        </ul>
                    </div>

                    <div className="rules-section rules-section-muted">
                        <p>
                            <strong>⚔️ Battle is demo-only</strong> and does not affect rankings yet.
                        </p>
                    </div>

                    <div className="rules-trust">
                        Scores update automatically as votes come in.
                    </div>
                </div>
            </div>
        </div>
    );
}
