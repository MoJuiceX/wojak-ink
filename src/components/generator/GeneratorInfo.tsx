/**
 * Generator Info Panel — "How It Works"
 *
 * Accordion-style modal explaining what Your Wojak is, how to create one,
 * pricing, free mints, and what makes the collection special.
 */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Paintbrush,
  Coins,
  Gift,
  Trophy,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { Lightbox } from '@/components/ui/Lightbox';

// ── Accordion ──

function InfoAccordion({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        border: '1px solid var(--color-border)',
        background: isOpen ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
      }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 p-3 cursor-pointer"
        style={{ background: 'transparent', color: 'var(--color-text)' }}
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 0, 0.1)',
            color: 'var(--color-primary)',
          }}
        >
          <Icon size={16} />
        </div>
        <span className="flex-1 text-left text-sm font-semibold">{title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
          className="shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 pt-0 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ──

interface GeneratorInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeneratorInfo({ isOpen, onClose }: GeneratorInfoProps) {
  return (
    <Lightbox isOpen={isOpen} onClose={onClose}>
      <div className="page-info-content">
        <header className="info-header">
          <h2>How It Works</h2>
          <p className="info-tagline">Create your Wojak. Mint it on-chain. It's yours forever.</p>
        </header>

        <div className="flex flex-col gap-2">
          {/* Section 1: What is Your Wojak? */}
          <InfoAccordion icon={Sparkles} title="What is Your Wojak?">
            <p className="mb-2">
              Your Wojak is a collection of up to{' '}
              <strong style={{ color: 'var(--color-primary)' }}>4,200 unique Wojak NFTs</strong>{' '}
              on the Chia blockchain. Each one is created by you — you pick the traits,
              the colors, the vibe. Your creation, minted on-chain forever.
            </p>
            <p>
              It's the companion collection to{' '}
              <strong>Wojak Farmers Plot</strong> (the OG 4,200).
              Same trait types, same universe — but this time you're the artist.
            </p>
          </InfoAccordion>

          {/* Section 2: How to Create */}
          <InfoAccordion icon={Paintbrush} title="How to Create">
            <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyleType: 'decimal' }}>
              <li>Pick a trait from each of the 7 categories: Face, Mouth, Face Wear, Head, Clothes, Background, and Base</li>
              <li>Customize colors on supported traits</li>
              <li>Preview your Wojak in real-time</li>
              <li>When you're happy, hit <strong style={{ color: 'var(--color-primary)' }}>Mint</strong></li>
            </ol>
          </InfoAccordion>

          {/* Section 3: Pricing */}
          <InfoAccordion icon={Coins} title="Pricing">
            <p className="mb-2">
              Base price:{' '}
              <span className="badge" style={{ fontSize: '0.75rem' }}>0.20 XCH</span>
            </p>
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyleType: 'disc' }}>
              <li>
                Popular traits cost more. The more a trait gets used, the higher its surcharge.
                This keeps the collection diverse.
              </li>
              <li>
                Only <strong>Head</strong>, <strong>Clothes</strong>, and <strong>Face Wear</strong>{' '}
                traits have surcharges. Mouth, Face, and Background are always base price.
              </li>
              <li>
                You pay one surcharge — the highest among your picks. Not all 7.
              </li>
              <li>
                Prices heal over time. If a trait stops being popular, its surcharge drops back toward zero.
              </li>
            </ul>
            <p className="mt-2" style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
              Example:{' '}
              <span style={{ color: 'var(--color-primary)' }}>
                0.45 XCH
              </span>
              {' '}(base 0.20 + 0.25 Crown surcharge)
            </p>
          </InfoAccordion>

          {/* Section 4: Free Mints */}
          <InfoAccordion icon={Gift} title="Free Mints">
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyleType: 'disc' }}>
              <li>
                Trade <strong>Wojak Farmers Plot</strong> NFTs on secondary markets and earn credits
              </li>
              <li>
                <strong style={{ color: 'var(--color-primary)' }}>100 credits = 1 free mint</strong>{' '}
                — no XCH needed
              </li>
              <li>Credits are tracked automatically from your marketplace activity</li>
              <li>Check your credit balance on the leaderboard</li>
            </ul>
          </InfoAccordion>

          {/* Section 5: What Makes It Special */}
          <InfoAccordion icon={Trophy} title="What Makes It Special">
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyleType: 'disc' }}>
              <li>
                Every Wojak is unique — your combination of 7 traits, your color choices, minted by you
              </li>
              <li>
                On-chain forever. IPFS-hosted image and metadata, minted on Chia
              </li>
              <li>
                The surcharge system means rare combos stay rare. The first person to mint with Crown
                pays less than the 100th. Early creativity is rewarded.
              </li>
              <li>
                <strong style={{ color: 'var(--color-primary)' }}>Royalties go to the creator</strong>{' '}
                — that's you. You earn royalties on your Wojak forever.
              </li>
            </ul>
          </InfoAccordion>
        </div>
      </div>
    </Lightbox>
  );
}
