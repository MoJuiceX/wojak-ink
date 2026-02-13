/**
 * G2 Trait Panel
 *
 * Shows detail selectors (flags, logos, etc.) for the currently active G2 trait.
 * Color palette lives in GeneratorRightPanel at top — same position for all traits.
 */

import { useState, useEffect, useMemo } from 'react';
import { Ban } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { getUnifiedTraitById, getG2BasePath, type UnifiedTrait } from '@/services/generatorService';
import { getFlagSvgDataUrl } from '@/services/canvasRenderer';
import { DetailSelector } from './DetailSelector';
import type { G2Selection } from '@/types/generator';

const COIN_LOGOS_BASE = '/assets/wojak-layers/CHIA_coin_logos';

const ASTRONAUT_LOGOS = ['BEPE', 'CASTER', 'CAT', 'CHAD', 'CHIA', 'XCH', 'CNI', 'COOKIES', 'Dexi Bucks', 'DIG', 'DWB', 'G4M', 'GYATT', 'HOA', 'HONK', 'JOCK', 'LOVE', 'MAX', 'MIRROR', 'MMM', 'MOG', 'MonkeyZoo', 'MRMT', 'NeckCoin', 'NWO', 'PEPEcoin', 'PIZZA', 'PP', 'Spacebucks', 'SPELLPOWER', 'SPROUT', 'STONKS', 'TANG', 'TVL', 'WITCHER', 'WOJAK'];

const ASTRONAUT_FLAGS = [
  // Americas
  'us', 'ca', 'mx', 'br', 'ar', 'co', 'cl', 'pe',
  // Europe
  'uk', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch', 'at', 'pt', 'gr', 'ie', 'pl', 'cz', 'hu', 'ro', 'bg', 'ua',
  // Scandinavia
  'se', 'no', 'dk', 'fi', 'is',
  // Asia
  'jp', 'cn', 'kr', 'in', 'tr', 'th', 'vn', 'ph', 'pk', 'id',
  // Middle East & Africa
  'il', 'eg', 'ng', 'za',
  // Oceania
  'au', 'nz',
  // Russia
  'ru',
];

/** Small flag preview button — fixed size, no overlap */
function FlagButton({ code, isSelected, onClick }: { code: string; isSelected: boolean; onClick: () => void }) {
  const flagSrc = useMemo(() => getFlagSvgDataUrl(code, 60, 40), [code]);
  return (
    <button
      type="button"
      className="overflow-hidden flex-shrink-0"
      style={{
        width: 'calc(25% - 4px)',
        height: 0,
        paddingBottom: 'calc(25% * 2 / 3 - 3px)',
        borderRadius: 3,
        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'transparent'}`,
        boxShadow: isSelected ? '0 0 4px rgba(255,107,0,0.5)' : 'none',
        backgroundImage: `url("${flagSrc}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      title={code.toUpperCase()}
      aria-label={code.toUpperCase()}
    />
  );
}

/** Small coin logo preview button — fixed size, no overlap */
function LogoButton({ name, isSelected, onClick }: { name: string; isSelected: boolean; onClick: () => void }) {
  const [ext, setExt] = useState('webp');
  const [imgError, setImgError] = useState(false);
  const src = `${COIN_LOGOS_BASE}/${name}.${ext}`;

  const handleImgError = () => {
    if (ext === 'webp') {
      setExt('png');
    } else {
      setImgError(true);
    }
  };

  return (
    <button
      type="button"
      className="overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{
        width: 'calc(25% - 4px)',
        height: 0,
        paddingBottom: 'calc(25% - 4px)',
        borderRadius: 6,
        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        boxShadow: isSelected ? '0 0 4px rgba(255,107,0,0.5)' : 'none',
        backgroundColor: isSelected ? 'rgba(255,107,0,0.1)' : 'var(--color-bg)',
        backgroundImage: !imgError ? `url("${src}")` : 'none',
        backgroundSize: '85%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      title={name}
      aria-label={name}
    >
      {imgError && (
        <span className="text-[7px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
          {name.slice(0, 4)}
        </span>
      )}
      {!imgError && (
        <img src={src} alt="" style={{ display: 'none' }} onError={handleImgError} />
      )}
    </button>
  );
}

interface G2TraitPanelProps {
  /** When set (e.g. Beer Hat underlayer focus), show this trait's details instead of activeLayer's main selection */
  overrideG2Selection?: G2Selection | null;
  /** Override detail selection handler (e.g. for Beer Hat underlayer to route to underlayer G2) */
  onDetailSelect?: (file: string | undefined, frameFile: string | undefined) => void;
  /** Override construction helmet update handler for underlayer routing */
  onConstructionHelmetUpdate?: (chiaLogo: boolean, cigPack: string) => void;
}

export function G2TraitPanel({ overrideG2Selection, onDetailSelect, onConstructionHelmetUpdate }: G2TraitPanelProps = {}) {
  const { activeLayer, g2Selections, setG2Detail } = useGenerator();

  const [trait, setTrait] = useState<UnifiedTrait | null>(null);
  const g2Sel = overrideG2Selection ?? g2Selections[activeLayer];
  const basePath = getG2BasePath();

  useEffect(() => {
    if (!g2Sel) {
      setTrait(null);
      return;
    }
    getUnifiedTraitById(g2Sel.traitId).then(setTrait).catch(() => setTrait(null));
  }, [g2Sel?.traitId]);

  if (!g2Sel || !trait) return null;

  const isAstronaut = trait.id === 'Clothes_Astronaut';
  const isBepeArmy = trait.id === 'Clothes_Bepe-army';
  const isSuit = trait.id === 'Clothes_Suit';
  const isWizardDrip = trait.id === 'Clothes_Wizard-drip';

  // BEPA Army: name tag inputs — limited by pixel width to fit the tag area
  if (isBepeArmy) {
    const name1 = g2Sel.name1 ?? '';
    const name2 = g2Sel.name2 ?? '';
    const handleNameChange = (which: 'name1' | 'name2', value: string) => {
      const capped = value.slice(0, 8).toUpperCase().replace(/[^A-Z0-9\s]/g, '');
      // Measure pixel width with the same font used on canvas (38px bold Comic Sans).
      // The visible tag area is ~210px wide (slightly wider than the 180px position rect).
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'bold 38px "Comic Sans MS", "Comic Sans", cursive';
        if (ctx.measureText(capped).width > 210) return;
      }
      setG2Detail(activeLayer, undefined, undefined, undefined, undefined, which === 'name1' ? capped : name1, which === 'name2' ? capped : name2);
    };
    return (
      <div
        className="rounded-xl p-3 flex flex-col gap-3"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Name 1
          </label>
          <input
            type="text"
            className="input text-sm"
            value={name1}
            onChange={(e) => handleNameChange('name1', e.target.value)}
            maxLength={8}
            placeholder="MAX 8"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Name 2
          </label>
          <input
            type="text"
            className="input text-sm"
            value={name2}
            onChange={(e) => handleNameChange('name2', e.target.value)}
            maxLength={8}
            placeholder="MAX 8"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
      </div>
    );
  }

  // Astronaut: coin logo (Detail 1) + flag (Detail 2)
  if (isAstronaut) {
    const logo = g2Sel.logoOption || 'CAT';
    const flag = g2Sel.flagOption || 'us';
    return (
      <div
        className="rounded-xl p-3 flex flex-col gap-3"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-wrap" style={{ gap: 4 }}>
            {ASTRONAUT_LOGOS.map((name) => (
              <LogoButton
                key={name}
                name={name}
                isSelected={logo === name}
                onClick={() => setG2Detail(activeLayer, undefined, undefined, name, g2Sel.flagOption)}
              />
            ))}
          </div>

        <div className="flex flex-wrap" style={{ gap: 4 }}>
            {ASTRONAUT_FLAGS.map((code) => (
              <FlagButton
                key={code}
                code={code}
                isSelected={flag === code}
                onClick={() => setG2Detail(activeLayer, undefined, undefined, g2Sel.logoOption, code)}
              />
            ))}
        </div>
      </div>
    );
  }

  // Suit: three text buttons (Suit, Tie, Bow) — no images
  if (isSuit) {
    const tieFile = trait.detailOptions?.find(d => d.name === 'Tie')?.file;
    const bowFile = trait.detailOptions?.find(d => d.name === 'Bow')?.file;
    const isTie = g2Sel.detailOption === tieFile;
    const isBow = g2Sel.detailOption === bowFile;
    const activeSlot = g2Sel.activeColorSlot ?? 'fill0';

    const handleSuitClick = () => setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, 'fill0');
    const handleTieClick = () => setG2Detail(activeLayer, tieFile, undefined, undefined, undefined, undefined, undefined, 'fill1');
    const handleBowClick = () => setG2Detail(activeLayer, bowFile, undefined, undefined, undefined, undefined, undefined, 'fill1');

    const btn = (label: string, isActive: boolean, onClick: () => void) => (
      <button
        type="button"
        className="btn btn-ghost text-sm py-2 px-2 sm:px-3 rounded-lg flex-1 whitespace-nowrap"
        style={{
          border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
          background: isActive ? 'rgba(255,107,0,0.1)' : 'var(--color-surface)',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
        }}
        onClick={onClick}
      >
        {label}
      </button>
    );

    return (
      <div
        className="rounded-xl p-3 flex flex-col gap-3"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-nowrap gap-2 min-w-0">
          {btn('Suit', activeSlot === 'fill0', handleSuitClick)}
          {btn('Tie', isTie && activeSlot === 'fill1', handleTieClick)}
          {btn('Bow', isBow && activeSlot === 'fill1', handleBowClick)}
        </div>
      </div>
    );
  }

  // Wizard drip: Detail 1, Detail 2, or coin logos (no None)
  if (isWizardDrip && trait.detailOptions && trait.detailOptions.length >= 2) {
    const detail1File = trait.detailOptions[0]!.file;
    const detail2File = trait.detailOptions[1]!.file;
    const frameForLogo = trait.frameFiles?.find(f => f.over === 'Logo Patch');
    const frameFile = frameForLogo?.file;
    const isDetail1 = g2Sel.detailOption === detail1File && !g2Sel.logoOption;
    const isDetail2 = g2Sel.detailOption === detail2File && !g2Sel.logoOption;
    const handleDetail1 = () => setG2Detail(activeLayer, detail1File, undefined, '');
    const handleDetail2 = () => setG2Detail(activeLayer, detail2File, undefined, '');
    const handleLogo = (name: string) => setG2Detail(activeLayer, '', frameFile, name);

    return (
      <div
        className="rounded-xl p-3 flex flex-col gap-3"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost text-sm py-2 px-3 rounded-lg"
            style={{
              border: isDetail1 ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: isDetail1 ? 'rgba(255,107,0,0.1)' : 'var(--color-surface)',
              color: isDetail1 ? 'var(--color-primary)' : 'var(--color-text)',
            }}
            onClick={handleDetail1}
          >
            Detail 1
          </button>
          <button
            type="button"
            className="btn btn-ghost text-sm py-2 px-3 rounded-lg"
            style={{
              border: isDetail2 ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: isDetail2 ? 'rgba(255,107,0,0.1)' : 'var(--color-surface)',
              color: isDetail2 ? 'var(--color-primary)' : 'var(--color-text)',
            }}
            onClick={handleDetail2}
          >
            Detail 2
          </button>
        </div>
        <div className="flex flex-wrap" style={{ gap: 4 }}>
          {ASTRONAUT_LOGOS.map((name) => (
            <LogoButton
              key={name}
              name={name}
              isSelected={!!g2Sel.logoOption && g2Sel.logoOption === name}
              onClick={() => handleLogo(name)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Construction Helmet: multi-select (Chia logo toggle + cigarette pack — can combine both)
  const isConstructionHelmet = trait.id === 'Head_Construction-Helmet';
  const detailOpts = trait.detailOptions;
  if (isConstructionHelmet && detailOpts && detailOpts.length >= 3) {
    const chiaOpt = detailOpts.find(d => d.file.includes('chia-logo'));
    const cig1Opt = detailOpts.find(d => d.file.endsWith('cig-pack.png'));
    const cig2Opt = detailOpts.find(d => d.file.includes('cig-pack-2'));
    const chiaOn = g2Sel.constructionHelmetChiaLogo ?? false;
    const cigPack = g2Sel.constructionHelmetCigPack ?? '';

    // Helper: always pass both values for reliable updates (avoids param-order bugs)
    const setConstructionHelmet = (chia: boolean, cig: string) => {
      if (onConstructionHelmetUpdate) {
        onConstructionHelmetUpdate(chia, cig);
      } else {
        setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, chia, cig);
      }
    };

    return (
      <div
        className="rounded-xl p-4 flex flex-col gap-4 overflow-visible"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Chia logo
          </span>
          <button
            type="button"
            className={`w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center ${chiaOn ? 'btn btn-primary' : 'btn btn-ghost'}`}
            style={{
              border: chiaOn ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            }}
            onClick={() => setConstructionHelmet(!chiaOn, cigPack)}
            title={chiaOn ? 'Remove Chia logo' : 'Add Chia logo'}
          >
            {chiaOpt && (
              <img src={`${basePath}/${chiaOpt.file}`} alt="Chia" className="w-full h-full object-contain" loading="lazy" />
            )}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Cigarette pack
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center ${!cigPack ? 'btn btn-primary' : 'btn btn-ghost'}`}
              style={{
                border: !cigPack ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              }}
              onClick={() => setConstructionHelmet(chiaOn, '')}
              title="None"
            >
              <Ban size={20} style={{ color: !cigPack ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            </button>
            {cig1Opt && (
              <button
                type="button"
                className={`w-14 h-14 rounded-lg overflow-hidden ${cigPack === cig1Opt.file ? 'btn btn-primary' : 'btn btn-ghost'}`}
                style={{
                  border: cigPack === cig1Opt.file ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                }}
                onClick={() => setConstructionHelmet(chiaOn, cig1Opt.file)}
                title="Pack 1"
              >
                <img src={`${basePath}/${cig1Opt.file}`} alt="Pack 1" className="w-full h-full object-contain" loading="lazy" />
              </button>
            )}
            {cig2Opt && (
              <button
                type="button"
                className={`w-14 h-14 rounded-lg overflow-hidden ${cigPack === cig2Opt.file ? 'btn btn-primary' : 'btn btn-ghost'}`}
                style={{
                  border: cigPack === cig2Opt.file ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                }}
                onClick={() => setConstructionHelmet(chiaOn, cig2Opt.file)}
                title="Pack 2"
              >
                <img src={`${basePath}/${cig2Opt.file}`} alt="Pack 2" className="w-full h-full object-contain" loading="lazy" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Other traits: standard DetailSelector
  const hasDetails = (trait.detailOptions && trait.detailOptions.length > 0) || false;
  if (!hasDetails) return null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <DetailSelector
        options={trait.detailOptions!}
        basePath={basePath}
        selectedOption={
          (trait.id === 'Clothes_SWAT' && !g2Sel.detailOption)
            ? trait.detailOptions![0].file
            : (trait.id === 'Head_Beer-Hat' && (!g2Sel.detailOption || g2Sel.detailOption === ''))
              ? (trait.detailOptions?.find(d => d.name === 'Citrus')?.file ?? trait.detailOptions?.[0]?.file)
              : g2Sel.detailOption
        }
        allowNone={trait.id !== 'Clothes_SWAT' && trait.id !== 'Head_Beer-Hat'}
        zoom={trait.id === 'Head_Beer-Hat' ? 6 : undefined}
        onSelect={(file) => {
          let frameFile: string | undefined;
          if (file && trait.frameFiles) {
            const detailName = trait.detailOptions?.find(d => d.file === file)?.name;
            const frame = trait.frameFiles.find(f => f.over === detailName);
            frameFile = frame?.file;
          }
          if (onDetailSelect) {
            onDetailSelect(file, frameFile);
          } else {
            // Use '' for None so reducer stores it (undefined is ignored)
            setG2Detail(activeLayer, file ?? '', frameFile);
          }
        }}
        label=""
      />
    </div>
  );
}

export default G2TraitPanel;
