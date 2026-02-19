/**
 * Generator Info Panel — "How It Works"
 *
 * Fixed-height scrollable panel explaining the Your Wojak collection:
 * narrative arc from Why → What you get → How → Free mints → Pricing.
 */

import { Lightbox } from '@/components/ui/Lightbox';

interface GeneratorInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

const sectionCard: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.015)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: 12,
  padding: '14px 16px',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-accent"
      style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 8,
      }}
    >
      {children}
    </h3>
  );
}

export function GeneratorInfo({ isOpen, onClose }: GeneratorInfoProps) {
  return (
    <Lightbox isOpen={isOpen} onClose={onClose} size="lg">
      <div
        className="text-sm leading-relaxed text-secondary"
      >
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2
            className="text-primary"
            style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}
          >
            The Wojak Generator
          </h2>
          <p style={{ maxWidth: 440, margin: '0 auto', lineHeight: 1.55 }}>
            Same handcrafted layers and lore from the Wojak Farmers Plot collection
            — but you choose every layer, every color, every detail.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-2.5">
          {/* Why Mint */}
          <div style={sectionCard}>
            <SectionTitle>Why mint Your Wojak?</SectionTitle>
            <ul className="flex flex-col gap-2.5 pl-4" style={{ listStyleType: 'disc' }}>
              <li>
                <strong className="text-primary">Earn 10% royalties forever</strong>{' '}
                — every time your Wojak is resold, you earn. The first 4,200 NFTs have
                royalties going directly to the minter. Once this phase ends, the royalty
                structure will change for future mints.
              </li>
              <li>
                <strong className="text-primary">Strengthen the ecosystem</strong>{' '}
                — Your Wojak drives secondary market activity for the Wojak Farmers Plot collection.
                The more people collect Farmers Plot NFTs, the more free mints they earn here.
              </li>
            </ul>
          </div>

          {/* How to Create */}
          <div style={sectionCard}>
            <SectionTitle>How to create</SectionTitle>
            <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyleType: 'decimal' }}>
              <li>Pick a trait from each of the 7 categories: Face, Mouth, Face Wear, Head, Clothes, Background, and Base</li>
              <li>Customize colors on supported traits</li>
              <li>Preview your Wojak in real-time</li>
              <li>
                Connect your wallet and hit{' '}
                <strong className="text-accent">Mint</strong>
              </li>
            </ol>
          </div>

          {/* Free Mints */}
          <div style={sectionCard}>
            <SectionTitle>Free mints</SectionTitle>
            <p className="mb-2">
              Pick up a Wojak Farmers Plot NFT on the secondary market and you earn
              free mint credits toward the generator.
            </p>
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyleType: 'disc' }}>
              <li>
                <strong className="text-accent">100 credits = 1 free mint</strong>{' '}
                — no XCH needed
              </li>
              <li>Credits are tracked automatically from your marketplace activity</li>
              <li>Works with XCH and supported community CAT tokens</li>
              <li>
                Popular traits cost more credits — the same surcharge logic as paid mints applies,
                so a trait with a surcharge will cost more than 100 credits
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div style={sectionCard}>
            <SectionTitle>Pricing</SectionTitle>
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
                Only <strong className="text-primary">Head</strong>,{' '}
                <strong className="text-primary">Clothes</strong>, and{' '}
                <strong className="text-primary">Face Wear</strong>{' '}
                traits have surcharges. Mouth, Face, and Background are always base price.
              </li>
              <li>
                You pay one surcharge — the highest among your picks. Not all 7.
              </li>
              <li>
                Prices heal over time. If a trait stops being popular, its surcharge drops back toward zero.
              </li>
            </ul>
            <p className="mt-2.5 text-muted" style={{ fontSize: '0.75rem' }}>
              Example:{' '}
              <span className="text-accent">0.45 XCH</span>{' '}
              (base 0.20 + 0.25 Crown surcharge)
            </p>
          </div>
        </div>
      </div>
    </Lightbox>
  );
}
