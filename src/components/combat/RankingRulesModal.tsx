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
                        <h4 className="rules-section-title">Farmer's Plot Power</h4>
                        <ul className="rules-list">
                            <li>Each <strong>Wojak Farmer's Plot</strong> in your DID = <span className="text-cyan">+20</span> power</li>
                            <li>Put all your Plots in your DID to maximize power</li>
                        </ul>
                    </div>

                    <div className="rules-section">
                        <h4 className="rules-section-title">Your Wojak Power</h4>
                        <ul className="rules-list">
                            <li><strong>Glaze</strong> = <span className="text-success">+1</span> vote score</li>
                            <li><strong>Fade</strong> = <span className="text-error">-1</span> vote score</li>
                            <li><strong>All</strong> your Wojak scores count toward power</li>
                        </ul>
                    </div>

                    <div className="rules-section">
                        <h4 className="rules-section-title">Collection Bonus</h4>
                        <ul className="rules-list">
                            <li>Buy Wojaks from <strong>other creators</strong> for bonus power</li>
                            <li>3-5 unique creators: <span className="text-cyan">+3</span> per Wojak</li>
                            <li>6-10 unique creators: <span className="text-cyan">+5</span> per Wojak</li>
                            <li>11+ unique creators: <span className="text-cyan">+7</span> per Wojak</li>
                            <li>Maximum <strong>25 collected Wojaks</strong> count</li>
                        </ul>
                    </div>

                    <div className="rules-section rules-section-muted">
                        <p>
                            <strong>Only verified purchases count</strong> — gifts and transfers don't earn bonus.
                        </p>
                    </div>

                    <div className="rules-trust">
                        Power updates automatically as you collect NFTs.
                    </div>
                </div>
            </div>
        </div>
    );
}
