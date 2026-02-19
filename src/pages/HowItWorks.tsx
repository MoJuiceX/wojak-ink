/**
 * How It Works - Combat Guide Page
 *
 * In-app guide explaining the combat system: 18 types, type matchups,
 * natures, abilities, battle mechanics, and power scoring.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Swords, Zap, Shield, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';

// Collapsible section helper component
function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card-static overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon}
        <span className="font-semibold flex-1">{title}</span>
        {isOpen ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Placeholder sections - will be implemented in subsequent tasks
function CombatTypesSection() {
  return (
    <CollapsibleSection title="18 Combat Types" icon={<Sparkles size={18} />} defaultOpen>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function TypeMatchupSection() {
  return (
    <CollapsibleSection title="Type Matchups" icon={<Swords size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function NaturesSection() {
  return (
    <CollapsibleSection title="Natures" icon={<Zap size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function AbilitiesSection() {
  return (
    <CollapsibleSection title="Abilities" icon={<Shield size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function HowBattlesWorkSection() {
  return (
    <CollapsibleSection title="How Battles Work" icon={<Swords size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function PowerScoringSection() {
  return (
    <CollapsibleSection title="Power & Rankings" icon={<Zap size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

export default function HowItWorks() {
  const { contentPadding } = useLayout();

  return (
    <PageTransition>
      <div style={{ padding: contentPadding }} className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">How Combat Works</h1>
          <p className="text-secondary mt-1">
            Everything you need to know about Wojak battles.
          </p>
        </div>

        <CombatTypesSection />
        <TypeMatchupSection />
        <NaturesSection />
        <AbilitiesSection />
        <HowBattlesWorkSection />
        <PowerScoringSection />
      </div>
    </PageTransition>
  );
}
