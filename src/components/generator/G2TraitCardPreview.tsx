/**
 * G2 Trait Card Preview
 *
 * Renders the image preview for a G2 trait card. Extracted from G2TraitCard
 * to keep the ternary chain manageable and each rendering path testable.
 */

import type { UnifiedTrait } from '@/services/generatorService';
import { getG2DefaultColor } from '@/config/g2DefaultColors';
import { getPreviewColorForLayeredFill, isLayerFill } from '@/utils/layeredTraitPreviewColors';
import { getDerivedColor, getFlagSvgDataUrl } from '@/services/canvasRenderer';
import { DEFAULT_CLOTHES_PATH, DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { getFillSlotBehavior, type DerivedFillSlotConfig } from '@/lib/g2FillTreatments';
import { G2_LAYER_BASE, COIN_LOGOS_BASE } from '@/config/layerAssetBase';

const G2_BASE_PATH = G2_LAYER_BASE;
const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

// ============ Shared sub-components ============

/** Full-size absolutely-positioned image */
function Img({ src, alt = '' }: { src: string; alt?: string }) {
  return <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />;
}

/** Color overlay masked to a fill image (multiply blend) */
function ColorFill({ file, color, opacity }: { file: string; color: string; opacity?: number }) {
  const url = `${G2_BASE_PATH}/${file}`;
  return (
    <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate', opacity: opacity ?? 1 }}>
      <Img src={url} />
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: color,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          maskImage: `url(${url})`,
          WebkitMaskImage: `url(${url})`,
          maskSize: 'cover',
          WebkitMaskSize: 'cover',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}

/** Standard base+clothes+mouth underlay used by most previews */
function BaseUnderlay({ needsClothesUnderlay }: { needsClothesUnderlay?: boolean }) {
  return (
    <>
      <Img src={DEFAULT_BASE_PATH} />
      {needsClothesUnderlay && <Img src={DEFAULT_CLOTHES_PATH} />}
      <Img src={DEFAULT_MOUTH_PATH} />
    </>
  );
}

// ============ Preview renderers ============

interface PreviewProps {
  trait: UnifiedTrait;
  needsClothesUnderlay?: boolean;
}

function renderLivePreview(url: string, name: string) {
  return <img src={url} alt={name} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />;
}

function renderNinjaTurtleFit(
  trait: UnifiedTrait,
  ninjaUnderBase: { key: string; file: string; type?: string }[],
  ninjaOverBase: { key: string; file: string; type?: string }[],
  needsClothesUnderlay?: boolean,
) {
  return (
    <>
      {ninjaUnderBase.map((l) =>
        isLayerFill(l) ? (
          <ColorFill key={l.key} file={l.file} color={getPreviewColorForLayeredFill(trait, l.key)} />
        ) : (
          <Img key={l.key} src={`${G2_BASE_PATH}/${l.file}`} />
        ),
      )}
      <Img src={DEFAULT_BASE_PATH} />
      {needsClothesUnderlay && <Img src={DEFAULT_CLOTHES_PATH} />}
      <Img src={DEFAULT_MOUTH_PATH} />
      {ninjaOverBase.map((l) =>
        isLayerFill(l) ? (
          <ColorFill key={l.key} file={l.file} color={getPreviewColorForLayeredFill(trait, l.key)} />
        ) : (
          <Img key={l.key} src={`${G2_BASE_PATH}/${l.file}`} />
        ),
      )}
    </>
  );
}

function renderLayeredColorable(
  trait: UnifiedTrait,
  layers: { key: string; file: string; type?: string; opacity?: number }[],
  needsClothesUnderlay?: boolean,
) {
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      {layers.map((l) =>
        isLayerFill(l) ? (
          <ColorFill key={l.key} file={l.file} color={getPreviewColorForLayeredFill(trait, l.key)} opacity={l.opacity} />
        ) : (
          <Img key={l.key} src={`${G2_BASE_PATH}/${l.file}`} />
        ),
      )}
    </>
  );
}

function renderComposite(
  underBase: { key: string; file: string }[],
  overBase: { key: string; file: string }[],
  needsClothesUnderlay?: boolean,
) {
  return (
    <>
      {underBase.map((l) => <Img key={l.key} src={`${G2_BASE_PATH}/${l.file}`} />)}
      <Img src={DEFAULT_BASE_PATH} />
      {needsClothesUnderlay && <Img src={DEFAULT_CLOTHES_PATH} />}
      {overBase.map((l) => <Img key={l.key} src={`${G2_BASE_PATH}/${l.file}`} />)}
      <Img src={DEFAULT_MOUTH_PATH} />
    </>
  );
}

function renderMOGGlasses({ trait, needsClothesUnderlay }: PreviewProps) {
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      <Img src={`${G2_BASE_PATH}/${trait.detailOptions?.find(d => d.name === 'Default (Rainbow)')?.file ?? 'Face-wear_MOG-Glasses_detail_default.png'}`} />
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile}`} alt={trait.name} />
    </>
  );
}

function renderChiaFarmer({ trait }: PreviewProps) {
  return (
    <>
      <Img src={DEFAULT_BASE_PATH} />
      <Img src={DEFAULT_MOUTH_PATH} />
      <ColorFill file="Clothes_Tee_fill.png" color={getG2DefaultColor(trait.id, 'fill1', trait, '#2563EB')} />
      <Img src={`${G2_BASE_PATH}/Clothes_Tee_outline.png`} />
      <ColorFill file={trait.fillFile!} color={getG2DefaultColor(trait.id, 'fill0', trait, '#22c55e')} />
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile}`} alt={trait.name} />
    </>
  );
}

function renderDualFill({ trait, needsClothesUnderlay }: PreviewProps) {
  const fill1Color = getG2DefaultColor(trait.id, 'fill1', trait, '#2563EB');

  // Check if fill2 should be derived from fill1 using fill treatment config
  const fill2Behavior = getFillSlotBehavior(trait.id, 'fill2');
  let fill2Color: string;
  if (fill2Behavior.type === 'derived') {
    const derived = fill2Behavior as DerivedFillSlotConfig;
    fill2Color = getDerivedColor(fill1Color, derived.treatment, derived.amount ?? 30);
  } else {
    fill2Color = getG2DefaultColor(trait.id, 'fill2', trait, '#f97316');
  }

  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      {/* fill1 + fill2 (e.g. Super Saiyan, SWAT, Bathrobe) */}
      <ColorFill file={trait.fill1File!} color={fill1Color} />
      <ColorFill file={trait.fill2File!} color={fill2Color} />
      {trait.id === 'Clothes_SWAT' && trait.detailOptions?.[0]?.file && (
        <Img src={`${G2_BASE_PATH}/${trait.detailOptions[0].file}`} />
      )}
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile}`} alt={trait.name} />
    </>
  );
}

function renderVRHeadset({ trait, needsClothesUnderlay }: PreviewProps) {
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      {trait.fillFiles!.map((file, i) => {
        const baseColor = getG2DefaultColor(trait.id, 'fill0', trait, '#FFFF00');
        const color = i === 0 ? baseColor : getDerivedColor(baseColor, 'darker_shade', 5);
        return <ColorFill key={file} file={file} color={color} />;
      })}
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile}`} alt={trait.name} />
    </>
  );
}

function renderDualFillFiles({ trait, needsClothesUnderlay }: PreviewProps) {
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      <ColorFill file={trait.fillFiles![0]} color={getG2DefaultColor(trait.id, 'fill0', trait, trait.defaultColors?.[0] ?? '#171717')} />
      <ColorFill file={trait.fillFiles![1]} color={getG2DefaultColor(trait.id, 'fill1', trait, trait.defaultColors?.[1] ?? '#2563EB')} />
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile ?? trait.outlineFiles![0]}`} alt={trait.name} />
    </>
  );
}

function renderConstructionHelmet({ trait, needsClothesUnderlay }: PreviewProps) {
  const chiaFile = trait.detailOptions?.find(d => d.file.includes('chia-logo'))?.file;
  const cigFile = trait.detailOptions?.find(d => d.file.endsWith('cig-pack.png'))?.file ?? 'Head_Construction-Helmet_detail_cig-pack.png';
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      <ColorFill file={trait.fillFile!} color={getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor ?? '#FFFF00')} />
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile}`} alt={trait.name} />
      {chiaFile && <Img src={`${G2_BASE_PATH}/${chiaFile}`} />}
      <Img src={`${G2_BASE_PATH}/${cigFile}`} />
    </>
  );
}

function renderAstronaut({ trait }: PreviewProps) {
  return (
    <>
      <Img src={DEFAULT_BASE_PATH} />
      <Img src={DEFAULT_MOUTH_PATH} />
      <Img src={`${G2_BASE_PATH}/Clothes_Astronaut_default.png`} />
      <div className="absolute" style={{ left: '28.7%', top: '84.4%', width: '13.6%', height: '13.6%', borderRadius: '50%', overflow: 'hidden' }}>
        <img src={`${COIN_LOGOS_BASE}/CAT.webp`} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <Img src={`${G2_BASE_PATH}/Clothes_Astronaut_detail1.1.png`} />
      <div className="absolute" style={{ left: '62.6%', top: '86.1%', width: '13.4%', height: '9.2%', overflow: 'hidden', borderRadius: '2px' }}>
        <img src={getFlagSvgDataUrl('us', 134, 92)} alt="" className="w-full h-full object-cover" />
      </div>
      <Img src={`${G2_BASE_PATH}/Clothes_Astronaut_detail2.2.png`} />
      <Img src={`${G2_BASE_PATH}/Clothes_Astronaut_outline.png`} alt={trait.name} />
    </>
  );
}

function renderSingleFill({ trait, needsClothesUnderlay }: PreviewProps) {
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      <ColorFill file={trait.fillFile!} color={getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor ?? trait.defaultColors?.[0] ?? '#2563EB')} />
      <Img src={`${G2_BASE_PATH}/${trait.outlineFile}`} alt={trait.name} />
    </>
  );
}

function renderSingleThumbnail(thumbnailSrc: string, name: string, needsClothesUnderlay?: boolean) {
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      <Img src={thumbnailSrc} alt={name} />
    </>
  );
}

function renderFallback(trait: UnifiedTrait, needsClothesUnderlay?: boolean) {
  const fallbackSrc =
    trait.outlineFile ? `${G2_BASE_PATH}/${trait.outlineFile}` :
    trait.layer0File ? `${G2_BASE_PATH}/${trait.layer0File}` :
    trait.fillFile ? `${G2_BASE_PATH}/${trait.fillFile}` :
    trait.layers?.[0]?.file ? `${G2_BASE_PATH}/${trait.layers[0].file}` : null;
  return (
    <>
      <BaseUnderlay needsClothesUnderlay={needsClothesUnderlay} />
      {fallbackSrc && <Img src={fallbackSrc} alt={trait.name} />}
    </>
  );
}

// ============ Main preview component ============

export interface G2TraitCardPreviewProps {
  trait: UnifiedTrait;
  needsClothesUnderlay?: boolean;
  livePreviewUrl?: string | null;
}

export function G2TraitCardPreview({ trait, needsClothesUnderlay, livePreviewUrl }: G2TraitCardPreviewProps) {
  // Pre-compute data needed by renderers
  const layeredColorableLayers = trait.colorable && trait.layers?.length
    ? [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)
    : null;

  const isNinjaTurtleFit = trait.id === 'Clothes_Ninja-turtle-fit';
  const ninjaUnderBase = isNinjaTurtleFit && layeredColorableLayers ? layeredColorableLayers.filter((l: { pos: number }) => l.pos <= 1) : [];
  const ninjaOverBase = isNinjaTurtleFit && layeredColorableLayers ? layeredColorableLayers.filter((l: { pos: number }) => l.pos >= 2) : [];

  const compositeLayers = trait.composite && trait.layers?.length
    ? [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)
    : null;
  const underBase = compositeLayers?.filter(l => l.underBase) ?? [];
  const overBase = compositeLayers?.filter(l => !l.underBase) ?? [];

  const singleThumbnail = !compositeLayers && !layeredColorableLayers
    ? (trait.outlineFile ? `${G2_BASE_PATH}/${trait.outlineFile}` : trait.layer0File ? `${G2_BASE_PATH}/${trait.layer0File}` : '')
    : null;

  const colorableSingleFill =
    !compositeLayers &&
    !layeredColorableLayers &&
    trait.colorable &&
    trait.fillFile &&
    trait.outlineFile &&
    (trait.defaultColor ?? trait.defaultColors?.[0]);

  const colorableDualFill =
    !compositeLayers &&
    !layeredColorableLayers &&
    trait.colorable &&
    (trait.fillFiles?.length ?? 0) >= 2 &&
    (trait.outlineFile || trait.outlineFiles?.[0]) &&
    ((trait.defaultColors?.length ?? 0) >= 2 || trait.defaultColor);

  // Select renderer based on trait characteristics
  if (livePreviewUrl) {
    return renderLivePreview(livePreviewUrl, trait.name);
  }
  if (isNinjaTurtleFit && ninjaUnderBase.length > 0) {
    return renderNinjaTurtleFit(trait, ninjaUnderBase, ninjaOverBase, needsClothesUnderlay);
  }
  if (layeredColorableLayers) {
    return renderLayeredColorable(trait, layeredColorableLayers, needsClothesUnderlay);
  }
  if (compositeLayers) {
    return renderComposite(underBase, overBase, needsClothesUnderlay);
  }
  if (trait.id === 'Face-wear_MOG-Glasses' && trait.outlineFile) {
    return renderMOGGlasses({ trait, needsClothesUnderlay });
  }
  if (trait.id === 'Clothes_Chia-farmer') {
    return renderChiaFarmer({ trait, needsClothesUnderlay });
  }
  if (trait.colorable && trait.fill1File && trait.fill2File && trait.outlineFile) {
    return renderDualFill({ trait, needsClothesUnderlay });
  }
  if (trait.id === 'Face-wear_VR-headset' && trait.fillFiles && trait.fillFiles.length >= 4 && trait.outlineFile) {
    return renderVRHeadset({ trait, needsClothesUnderlay });
  }
  if (colorableDualFill) {
    return renderDualFillFiles({ trait, needsClothesUnderlay });
  }
  if (trait.id === 'Head_Construction-Helmet' && trait.fillFile && trait.outlineFile) {
    return renderConstructionHelmet({ trait, needsClothesUnderlay });
  }
  if (trait.id === 'Clothes_Astronaut' && colorableSingleFill) {
    return renderAstronaut({ trait, needsClothesUnderlay });
  }
  if (colorableSingleFill) {
    return renderSingleFill({ trait, needsClothesUnderlay });
  }
  if (singleThumbnail) {
    return renderSingleThumbnail(singleThumbnail, trait.name, needsClothesUnderlay);
  }
  return renderFallback(trait, needsClothesUnderlay);
}
