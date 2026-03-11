/**
 * Canvas renderer layer builder: builds the flat list of render layers from selections.
 * Single place for all virtual-layer logic (Astronaut, ClothesAddon, BubbleGumRekt, etc.)
 * and path-based condition helpers. To add a virtual layer, add the condition and push here;
 * see docs/GENERATOR-CHECKLIST.md. G2 composite expansion remains in the main renderer.
 */

import type { SelectedLayers } from '@/lib/wojakRules';
import type { G2Selections } from '@/types/generator';
import { RENDER_ORDER } from '@/lib/layerRegistry';
import {
  LAYER_Z_INDEX,
  CLIP,
  MOUTH_OVER_CENTURION,
  MOUTH_OVER_PIRATE,
  NINJA_COVERING_MASKS,
  FULL_FACE_MASKS,
  HEADS_NEEDING_EYES_OVERLAY,
  SUITS_NEEDING_EYES_UNDER,
} from '@/services/canvasRendererConstants';

// Helper for Trump Hair + MOG Glasses + Copium combo
function isTrumpHair(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'trump');
}
import type { RenderLayer } from '@/services/canvasRendererTypes';
import { isExtraAccessoryPath, isWingsExtraPath } from '@/lib/generatorExtras';
import { pathContains } from '@/lib/pathHelpers';
import { isSelectionPathEmpty } from '@/types/generator';

// ============ Helpers ============

const LOCAL_REKT_MOUTH_OVERLAYS = {
  bubbleGum: '/assets/wojak-layers/MOUTH/MOUTH_Bubble-Gum_rekt.png',
  pipe: '/assets/wojak-layers/MOUTH/MOUTH_Pipe-when-rekt.png',
} as const;

function getBubbleGumRenderPath(selectedLayers: SelectedLayers, hasRekt: boolean): string | undefined {
  const mouthBasePath = selectedLayers.MouthBase;
  if (!mouthBasePath) return undefined;
  return hasRekt ? LOCAL_REKT_MOUTH_OVERLAYS.bubbleGum : mouthBasePath;
}

function getEffectiveMaskPath(selectedLayers: SelectedLayers): string | undefined {
  const maskPath = selectedLayers.Mask;
  if (isExtraAccessoryPath(maskPath)) return undefined;
  return maskPath;
}

function isCenturionSelected(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'centurion');
}

function isMouthOverCenturion(path: string): boolean {
  return MOUTH_OVER_CENTURION.some((trait) => pathContains(path, trait));
}

function isMouthOverPirate(path: string): boolean {
  return MOUTH_OVER_PIRATE.some((trait) => pathContains(path, trait));
}

function hasMask(selectedLayers: SelectedLayers): boolean {
  const maskPath = getEffectiveMaskPath(selectedLayers);
  return !isSelectionPathEmpty(maskPath);
}

function needsCenturionMaskVariant(selectedLayers: SelectedLayers): boolean {
  return hasMask(selectedLayers);
}

function getCenturionPath(originalPath: string, needsMaskVariant: boolean): string {
  if (needsMaskVariant) {
    return originalPath.replace('HEAD_Centurion_.png', 'HEAD_Centurion_mask.png');
  }
  return originalPath;
}

function isRektFace(selectedLayers: SelectedLayers, g2Selections?: G2Selections | null): boolean {
  const baseTraitId = g2Selections?.Base?.traitId;
  if (baseTraitId) {
    return pathContains(baseTraitId, 'rekt') && !pathContains(baseTraitId, 'rugged');
  }

  const basePath = selectedLayers.Base;
  if (!basePath) return false;
  return pathContains(basePath, 'rekt') && !pathContains(basePath, 'rugged');
}

function hasBubbleGum(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.MouthBase, 'Bubble-Gum') || pathContains(selectedLayers.MouthBase, 'BubbleGum');
}

function hasRoninHelmet(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'ronin');
}

function has2PacBandana(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, '2pac') && pathContains(selectedLayers.Head, 'bandana');
}

function hasAnarchySpikes(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'anarchy') || pathContains(selectedLayers.Head, 'spikes');
}

function hasBandanaMask(selectedLayers: SelectedLayers): boolean {
  return pathContains(getEffectiveMaskPath(selectedLayers), 'bandana');
}

function needsEyesOverHead(selectedLayers: SelectedLayers): boolean {
  const headPath = selectedLayers.Head;
  if (!headPath) return false;
  return HEADS_NEEDING_EYES_OVERLAY.some((head) => pathContains(headPath, head));
}

function isTysonTattoo(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'tyson') || pathContains(path, 'tattoo');
}

function isNinjaTurtle(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'ninja') || pathContains(path, 'turtle');
}

function isMaskThatCoversNinja(selectedLayers: SelectedLayers): boolean {
  const maskPath = getEffectiveMaskPath(selectedLayers);
  if (!maskPath) return false;
  return NINJA_COVERING_MASKS.some((mask) => pathContains(maskPath, mask));
}

function isAstronautSelected(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'astronaut');
}

function isChiaFarmer(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'chia') && pathContains(path, 'farmer');
}

function getChiaFarmerAddonPath(clothesPath: string): string {
  return clothesPath.replace(/(_?)\.png$/, '_add.png');
}

function isHannibalMask(selectedLayers: SelectedLayers): boolean {
  return pathContains(getEffectiveMaskPath(selectedLayers), 'hannibal');
}

function isCopiumMask(selectedLayers: SelectedLayers): boolean {
  return pathContains(getEffectiveMaskPath(selectedLayers), 'copium');
}

function needsLayersAboveHead(selectedLayers: SelectedLayers): boolean {
  const headPath = selectedLayers.Head;
  if (!headPath) return false;
  const isStandardCut = pathContains(headPath, 'standard') && pathContains(headPath, 'cut');
  const isTrumpWave = pathContains(headPath, 'trump') && pathContains(headPath, 'wave');
  return isStandardCut || isTrumpWave;
}

function isTrumpWave(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'trump') && pathContains(selectedLayers.Head, 'wave');
}

function isSuperSaiyan(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'saiyan');
}

function isEyePatch(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'eye') && pathContains(path, 'patch');
}

function isLaserEyes(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'laser');
}

function isFullFaceMask(path: string | undefined): boolean {
  if (!path) return false;
  return FULL_FACE_MASKS.some((mask) => pathContains(path, mask));
}

/** Full-body suits (Gopher, Sonic, Proof of Prayer, Pickle, Goose, Bepe, Pepe) that render on top of eyewear. */
function isSuitNeedingEyesUnder(selectedLayers: SelectedLayers): boolean {
  const clothesPath = selectedLayers.Clothes;
  if (!clothesPath) return false;
  return SUITS_NEEDING_EYES_UNDER.some((id) => pathContains(clothesPath, id));
}

function isGooseSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'goose-suit');
}

function isBepeSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'bepe-suit');
}

function isPepeSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'pepe-suit');
}

function isGopherSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'gopher-suit');
}

function isSonicSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'sonic-suit');
}

function isPickleSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'pickle-suit');
}

function isNightVision(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'night-vision') || pathContains(path, 'nightvision');
}

function isHardHat(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'hard-hat') || pathContains(selectedLayers.Head, 'hard_hat');
}

function isVRHeadset(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'vr') && pathContains(path, 'headset');
}

function is3DGlasses(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, '3d') && pathContains(path, 'glas');
}

function isMogGlasses(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'mog');
}

function isProofOfPrayer(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'proof') && pathContains(selectedLayers.Clothes, 'prayer');
}

function isPirateHead(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'pirate');
}

function isFirefighterHelmet(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'firefigther') || pathContains(selectedLayers.Head, 'firefighter');
}

function isSwatHelmet(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'swat');
}

function isTinfoilHead(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'tin-foil');
}

function isBeanieHead(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'beanie');
}

function isPropellerHat(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'propeller');
}

function hasNeckbeard(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.FacialHair, 'neckbeard');
}


/** Suits that are incompatible with bandana mask */
function isSuitIncompatibleWithBandana(selectedLayers: SelectedLayers): boolean {
  const c = selectedLayers.Clothes;
  return pathContains(c, 'sonic-suit') || pathContains(c, 'pickle-suit') || pathContains(c, 'goose-suit');
}



// ============ Layer Building ============

/**
 * Build render layers from selections with all special handling (virtual layers, skip logic, z-index).
 * Returns a flat list sorted by zIndex. G2 expansion and .g2 attachment are done by the main renderer.
 */
export function buildRenderLayers(selectedLayers: SelectedLayers, g2Selections?: G2Selections | null): RenderLayer[] {
  const layers: RenderLayer[] = [];

  const hasCenturion = isCenturionSelected(selectedLayers);
  const centurionMaskVariant = needsCenturionMaskVariant(selectedLayers);
  const hasRekt = isRektFace(selectedLayers, g2Selections);
  const hasBubble = hasBubbleGum(selectedLayers);
  const hasRonin = hasRoninHelmet(selectedLayers);
  const hasBandanaRaw = hasBandanaMask(selectedLayers);
  // Bandana is effectively absent when an incompatible suit suppresses it
  const hasBandana = hasBandanaRaw && !isSuitIncompatibleWithBandana(selectedLayers);
  const hasAstronaut = isAstronautSelected(selectedLayers);
  const eyesPath = selectedLayers.Eyes ?? '';
  const hasTyson = isTysonTattoo(eyesPath);
  const hasNinja = isNinjaTurtle(eyesPath);
  const hasEyePatchSelected = isEyePatch(eyesPath);
  const hasLaserEyesSelected = isLaserEyes(eyesPath);
  const maskCoversNinja = isMaskThatCoversNinja(selectedLayers);
  const hasMaskSelected = hasMask(selectedLayers);
  const needsEyesOverlay = needsEyesOverHead(selectedLayers);
  const hasHannibal = isHannibalMask(selectedLayers);
  const hasCopium = isCopiumMask(selectedLayers);
  const hasLayersAboveHead = needsLayersAboveHead(selectedLayers);
  const effectiveMaskPath = getEffectiveMaskPath(selectedLayers);
  const hasFullFaceMask = isFullFaceMask(effectiveMaskPath);
  const hasSuitEyesUnder = !hasAstronaut && isSuitNeedingEyesUnder(selectedLayers);
  const hasSwat = isSwatHelmet(selectedLayers);

  for (const layerName of RENDER_ORDER) {
    const rawPath = selectedLayers[layerName];
    if (isSelectionPathEmpty(rawPath)) continue;
    let path = rawPath as string;

    let zIndex = LAYER_Z_INDEX[layerName];
    let skipLayer = false;

    switch (layerName) {
      case 'Clothes':
        if (hasAstronaut) skipLayer = true;
        break;

      case 'Head':
        if (hasAstronaut) skipLayer = true;
        if (hasCenturion && centurionMaskVariant) path = getCenturionPath(path, true);
        // Centurion: split bottom-right quadrant to render under facial hair, mouth, mask, eyes.
        // The chin guard/cheek flap area tucks under other face layers for natural overlap.
        if (hasCenturion && !hasAstronaut) {
          // Bottom-right quadrant: under everything at z 3.5
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.CenturionUnder,
            layerName: 'CenturionUnder',
            clipPolygon: [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]],
          });
          // Remaining three quadrants (L-shape): at normal Head z-index
          layers.push({
            path,
            zIndex,
            layerName: 'Head',
            clipPolygon: [[0, 0], [1, 0], [1, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]],
          });
          skipLayer = true;
        }
        break;

      case 'Mask':
        if (isExtraAccessoryPath(path)) skipLayer = true;
        else if (hasFullFaceMask) skipLayer = true;
        else if (hasAstronaut) skipLayer = true;
        else if (hasHannibal) skipLayer = true;
        else if (hasCopium && hasLayersAboveHead) skipLayer = true;
        // Copium + any full-body suit: left 43.1% under suit, right 56.9% on top
        else if (hasCopium && hasSuitEyesUnder) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipRightPercent: 1 - CLIP.COPIUM_SUIT,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: CLIP.COPIUM_SUIT,
          });
          skipLayer = true;
        }
        // Bandana + Firefighter Helmet: crop left 27%
        else if (hasBandana && isFirefighterHelmet(selectedLayers)) {
          layers.push({ path, zIndex, layerName: 'Mask', clipLeftPercent: 0.27 });
          skipLayer = true;
        }
        // Bandana + Centurion: crop left 25%
        else if (hasBandana && hasCenturion) {
          layers.push({ path, zIndex, layerName: 'Mask', clipLeftPercent: 0.25 });
          skipLayer = true;
        }
        // Bandana + incompatible suit (Sonic, Pickle, Goose): skip entirely
        else if (hasBandanaRaw && isSuitIncompatibleWithBandana(selectedLayers)) skipLayer = true;
        // Bandana + Gopher suit + Ninja Turtle: crop left 30.1%, then 30.1%-41.5% under suit, 41.5%+ on top
        else if (hasBandana && isGopherSuit(selectedLayers) && hasNinja) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipLeftPercent: 0.301,
            clipRightPercent: 1 - 0.415,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.415,
          });
          skipLayer = true;
        }
        // Bandana + Gopher suit: crop left 30.1%, then 30.1%-45.2% under suit, 45.2%+ on top
        else if (hasBandana && isGopherSuit(selectedLayers)) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipLeftPercent: 0.301,
            clipRightPercent: 1 - 0.452,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.452,
          });
          skipLayer = true;
        }
        // Bandana + Proof of Prayer: crop left 35%, then 35%-45.2% under suit, 45.2%+ on top
        else if (hasBandana && isProofOfPrayer(selectedLayers)) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipLeftPercent: 0.35,
            clipRightPercent: 1 - 0.452,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.452,
          });
          skipLayer = true;
        }
        // Bandana + Bepe suit: crop left 30.1%, then 30.1%-41.5% under suit, 41.5%+ on top
        else if (hasBandana && isBepeSuit(selectedLayers)) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipLeftPercent: 0.301,
            clipRightPercent: 1 - 0.415,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.415,
          });
          skipLayer = true;
        }
        // Bandana + Pepe suit: crop left 35%, then 35%-38.9% under suit, 38.9%+ on top
        else if (hasBandana && isPepeSuit(selectedLayers)) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipLeftPercent: 0.35,
            clipRightPercent: 1 - 0.389,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.389,
          });
          skipLayer = true;
        }
        // Bandana + MOG Glasses + suit: crop left 27.7%, then 27.7%-36% under suit, 36%+ on top
        else if (hasBandana && hasSuitEyesUnder && isMogGlasses(eyesPath)) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipLeftPercent: 0.277,
            clipRightPercent: 1 - 0.36,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.36,
          });
          skipLayer = true;
        }
        // Bandana + other suit: left 37% under suit, right 63% at normal Mask z (above suit, below eyes)
        else if (hasBandana && hasSuitEyesUnder) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipRightPercent: CLIP.SUIT_EYES_RIGHT,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: CLIP.SUIT_EYES_LEFT,
          });
          skipLayer = true;
        }
        break;

      case 'Eyes':
        if (hasLaserEyesSelected && hasAstronaut) {
          layers.push({ path, zIndex: LAYER_Z_INDEX.LaserEyesOverAstronaut, layerName: 'LaserEyesOverAstronaut' });
          skipLayer = true;
          break;
        }
        if (hasNinja && hasAstronaut) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: CLIP.NINJA_DEFAULT });
          skipLayer = true;
          break;
        }
        if (hasNinja && hasRonin) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: CLIP.NINJA_DEFAULT });
          skipLayer = true;
          break;
        }
        if (hasNinja && isPirateHead(selectedLayers)) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.22 });
          skipLayer = true;
          break;
        }
        if (hasNinja && isFirefighterHelmet(selectedLayers)) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.28 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + 2Pac Bandana: crop left 26.7%
        if (hasNinja && has2PacBandana(selectedLayers)) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.267 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Anarchy Spikes: crop left 25%
        if (hasNinja && hasAnarchySpikes(selectedLayers)) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.25 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Beanie: crop left 27.6%
        if (hasNinja && pathContains(selectedLayers.Head, 'beanie')) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.276 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Centurion: crop left 28.1%
        if (hasNinja && isCenturionSelected(selectedLayers)) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.281 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Clown: crop left 27.7%
        if (hasNinja && pathContains(selectedLayers.Head, 'clown')) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.277 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Comrade Hat: crop left 23.7%
        if (hasNinja && pathContains(selectedLayers.Head, 'comrade')) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.237 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Construction Helmet: crop left 25.3%
        if (hasNinja && pathContains(selectedLayers.Head, 'construction')) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.253 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + SWAT Helmet: crop left 24.7%
        if (hasNinja && pathContains(selectedLayers.Head, 'swat')) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.247 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Wizard Hat (G2 path is "Wiz-Hat"): crop left 24.2%
        if (hasNinja && (pathContains(selectedLayers.Head, 'wiz-hat') || pathContains(selectedLayers.Head, 'wizard'))) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.242 });
          skipLayer = true;
          break;
        }
        // Ninja Turtle + Hard Hat: crop left 25.2%
        if (hasNinja && pathContains(selectedLayers.Head, 'hard-hat')) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.252 });
          skipLayer = true;
          break;
        }
        // Hard Hat + Night Vision: crop left 24% and top 19.2%
        if (isHardHat(selectedLayers) && isNightVision(path)) {
          layers.push({
            path,
            zIndex,
            layerName,
            clipPolygon: [[0.24, 0.192], [1, 0.192], [1, 1], [0.24, 1]],
          });
          skipLayer = true;
          break;
        }
        if (hasTyson && hasMaskSelected) skipLayer = true;
        if (hasNinja && maskCoversNinja) skipLayer = true;
        if (hasEyePatchSelected && hasHannibal) skipLayer = true;
        if (hasLayersAboveHead && !hasEyePatchSelected) skipLayer = true;
        // Hannibal + suit: left 50% under suit, right 50% on top (above Hannibal)
        if (!skipLayer && hasHannibal && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: CLIP.HALF,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipLeftPercent: CLIP.HALF,
          });
          skipLayer = true;
        }
        // Bandana + any suit: simple X-only split to keep eyes always above bandana mask
        if (!skipLayer && hasBandana && hasSuitEyesUnder && eyesPath) {
          // Match the bandana's underSuit X boundary per suit so eyes on-top aligns with bandana on-top
          let splitX: number = CLIP.SUIT_EYES_LEFT;
          let cropX = 0;
          let cropY = 0;
          if (isGopherSuit(selectedLayers) && hasNinja) {
            splitX = 0.415;
          } else if (isGopherSuit(selectedLayers)) {
            splitX = 0.452;
          } else if (isProofOfPrayer(selectedLayers)) {
            splitX = 0.452; cropX = 0.319; cropY = 0.171;
          } else if (isBepeSuit(selectedLayers)) {
            splitX = 0.415; cropX = 0.319; cropY = 0.171;
          } else if (isPepeSuit(selectedLayers)) {
            splitX = 0.389; cropX = 0.319; cropY = 0.171;
          } else if (isMogGlasses(eyesPath)) {
            splitX = 0.36;
          }
          if (cropX > 0 || cropY > 0) {
            layers.push({
              path: eyesPath,
              zIndex: LAYER_Z_INDEX.EyesUnderSuit,
              layerName: 'EyesUnderSuit',
              clipPolygon: [[cropX, cropY], [splitX, cropY], [splitX, 1], [cropX, 1]],
            });
            layers.push({
              path: eyesPath,
              zIndex: LAYER_Z_INDEX.Eyes,
              layerName: 'EyesOverSuit',
              clipPolygon: [[splitX, cropY], [1, cropY], [1, 1], [splitX, 1]],
            });
          } else {
            layers.push({
              path: eyesPath,
              zIndex: LAYER_Z_INDEX.EyesUnderSuit,
              layerName: 'EyesUnderSuit',
              clipRightPercent: 1 - splitX,
            });
            layers.push({
              path: eyesPath,
              zIndex: LAYER_Z_INDEX.Eyes,
              layerName: 'EyesOverSuit',
              clipLeftPercent: splitX,
            });
          }
          skipLayer = true;
        }
        // Ninja Turtle + Gopher suit: under-suit left 35% + top 50% (union)
        if (!skipLayer && hasNinja && isGopherSuit(selectedLayers) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.35,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.35, 0], [1, 0], [1, 0.5], [0.35, 0.5]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.35, 0.5], [1, 0.5], [1, 1], [0.35, 1]],
          });
          skipLayer = true;
        }
        // Ninja Turtle + Sonic suit: crop left 30.1%, under-suit left 38.8% + top 36.7% (union)
        if (!skipLayer && hasNinja && isSonicSuit(selectedLayers) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipPolygon: [[0.301, 0], [0.388, 0], [0.388, 1], [0.301, 1]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.388, 0], [1, 0], [1, 0.367], [0.388, 0.367]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.388, 0.367], [1, 0.367], [1, 1], [0.388, 1]],
          });
          skipLayer = true;
        }
        // Ninja Turtle + any full-body suit: render under suit with left side cut out
        if (!skipLayer && hasNinja && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipLeftPercent: CLIP.NINJA_DEFAULT,
          });
          skipLayer = true;
        }
        // Proof of Prayer / Goose suit + any eyes: crop left 31.9% + top 17.1%, under-suit left 50.4% + top 29.5% (union)
        if (!skipLayer && (isProofOfPrayer(selectedLayers) || isGooseSuit(selectedLayers)) && hasSuitEyesUnder && eyesPath) {
          // Under: left strip (full height within cropped area)
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipPolygon: [[0.319, 0.171], [0.504, 0.171], [0.504, 1], [0.319, 1]],
          });
          // Under: top-right strip
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.504, 0.171], [1, 0.171], [1, 0.295], [0.504, 0.295]],
          });
          // Over: bottom-right corner
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.504, 0.295], [1, 0.295], [1, 1], [0.504, 1]],
          });
          skipLayer = true;
        }
        // Bepe / Pepe suit + any eyes: X split at 0.417, Y split at 0.373
        if (!skipLayer && (isBepeSuit(selectedLayers) || isPepeSuit(selectedLayers)) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipPolygon: [[0.339, 0.171], [0.417, 0.171], [0.417, 1], [0.339, 1]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.417, 0.171], [1, 0.171], [1, 0.373], [0.417, 0.373]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.417, 0.373], [1, 0.373], [1, 1], [0.417, 1]],
          });
          skipLayer = true;
        }
        // Gopher suit + Night Vision: no crop, under-suit left 69.3% + top 34% (union)
        if (!skipLayer && isGopherSuit(selectedLayers) && isNightVision(eyesPath) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.693,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.693, 0], [1, 0], [1, 0.34], [0.693, 0.34]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.693, 0.34], [1, 0.34], [1, 1], [0.693, 1]],
          });
          skipLayer = true;
        }
        // Gopher suit + VR headset: no crop, under-suit left 62.9% + top 28.4% (union)
        if (!skipLayer && isGopherSuit(selectedLayers) && isVRHeadset(eyesPath) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.629,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.629, 0], [1, 0], [1, 0.284], [0.629, 0.284]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.629, 0.284], [1, 0.284], [1, 1], [0.629, 1]],
          });
          skipLayer = true;
        }
        // Gopher suit + Eye Patch: simple X-only split, under-suit left 57.9%
        if (!skipLayer && isGopherSuit(selectedLayers) && hasEyePatchSelected && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.579,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipLeftPercent: 0.579,
          });
          skipLayer = true;
        }
        // Gopher suit + MOG Glasses: simple X-only split, under-suit left 58.2%
        if (!skipLayer && isGopherSuit(selectedLayers) && isMogGlasses(eyesPath) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.582,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipLeftPercent: 0.582,
          });
          skipLayer = true;
        }
        // Gopher suit + other eyes: no crop, under-suit left 37.3% + top 28.4% (union)
        if (!skipLayer && isGopherSuit(selectedLayers) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.373,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.373, 0], [1, 0], [1, 0.284], [0.373, 0.284]],
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.373, 0.284], [1, 0.284], [1, 1], [0.373, 1]],
          });
          skipLayer = true;
        }
        // Pickle suit + MOG Glasses: simple X-only split, under-suit left 43.4%
        if (!skipLayer && isPickleSuit(selectedLayers) && isMogGlasses(eyesPath) && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.434,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipLeftPercent: 0.434,
          });
          skipLayer = true;
        }
        // MOG Glasses + full-body suit (non-PoP): L-shaped under-suit (left 36% + top 36.3% under, bottom-right on top)
        if (!skipLayer && isMogGlasses(eyesPath) && hasSuitEyesUnder && eyesPath) {
          // Under: full-height left strip
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 1 - 0.36,
          });
          // Under: top-right portion
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit2',
            clipPolygon: [[0.36, 0], [1, 0], [1, 0.363], [0.36, 0.363]],
          });
          // Over: bottom-right corner
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: [[0.36, 0.363], [1, 0.363], [1, 1], [0.36, 1]],
          });
          skipLayer = true;
        }
        // Full-body suits: left 63% of eyes under suit, right 37% at normal Eyes z (above masks and suit)
        if (!skipLayer && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: CLIP.SUIT_EYES_LEFT,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipLeftPercent: CLIP.SUIT_EYES_RIGHT,
          });
          skipLayer = true;
        }
        break;

      case 'FacialHair':
        if (hasBandana) skipLayer = true;
        if (hasCenturion && pathContains(path, 'stach')) zIndex = LAYER_Z_INDEX.Head + 1;
        // Neckbeard + suit: left 42.6% under suit, right on top
        if (pathContains(path, 'neckbeard') && (isProofOfPrayer(selectedLayers) || isGopherSuit(selectedLayers) || isGooseSuit(selectedLayers))) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.FacialHairUnderSuit,
            layerName: 'FacialHairUnderSuit',
            clipRightPercent: 1 - 0.426,
          });
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.FacialHair,
            layerName: 'FacialHair',
            clipLeftPercent: 0.426,
          });
          skipLayer = true;
        }
        // Neckbeard + Ronin Helmet: left 50% under helmet, right 50% on top
        else if (pathContains(path, 'neckbeard') && hasRonin) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.FacialHair,
            layerName: 'FacialHair',
            clipRightPercent: 0.5, // left 50% renders normally (under head)
          });
          skipLayer = true; // NeckbeardOverRonin virtual layer handles the right 50%
        }
        break;

      case 'MouthBase':
        if (hasBandana) skipLayer = true;
        else if (hasAstronaut) {
          const blockedMouthOptions = ['pipe', 'pizza', 'bubble-gum'];
          if (blockedMouthOptions.some((opt) => pathContains(path, opt))) skipLayer = true;
        }
        if (hasCenturion && isMouthOverCenturion(path)) zIndex = LAYER_Z_INDEX.Head + 1;
        break;

      case 'MouthItem':
        if (hasBandana) skipLayer = true;
        else if (hasAstronaut) skipLayer = true;
        if (hasCenturion && isMouthOverCenturion(path)) zIndex = LAYER_Z_INDEX.Head + 1;
        break;
    }

    if (!skipLayer) {
      layers.push({ path, zIndex, layerName });
    }
  }

  // Virtual layers: Astronaut
  if (hasAstronaut) {
    const clothesPath = selectedLayers.Clothes;
    if (clothesPath) {
      layers.push({
        path: clothesPath,
        zIndex: LAYER_Z_INDEX.Astronaut,
        layerName: 'Astronaut',
      });
    }
    const maskPathRaw = effectiveMaskPath;
    if (!isSelectionPathEmpty(maskPathRaw) && !hasFullFaceMask) {
      const maskPath = maskPathRaw as string;
      if (pathContains(maskPath, 'bandana')) {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.MaskUnderAstronaut,
          layerName: 'MaskUnderAstronaut',
          clipLeftPercent: 0.30,
        });
      } else if (pathContains(maskPath, 'hannibal')) {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.MaskUnderAstronaut,
          layerName: 'MaskUnderAstronaut',
        });
      } else if (pathContains(maskPath, 'copium')) {
        // Copium + Astronaut: fill+outline render under suit AND under eyes (z=Mask=7), detail renders on top
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.Mask,
          layerName: 'CopiumFillOutlineUnderAstronaut',
        });
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.CopiumDetailOverAstronaut,
          layerName: 'CopiumDetailOverAstronaut',
        });
      } else {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.MaskOverAstronaut,
          layerName: 'MaskOverAstronaut',
        });
      }
    }
  }

  // ClothesAddon (legacy G1 Chia Farmer only; G2 Chia Farmer draws under layer + outfit in buildG2LayerData)
  const clothesPath = selectedLayers.Clothes;
  if (clothesPath && isChiaFarmer(clothesPath) && !clothesPath.startsWith('/g2/')) {
    layers.push({
      path: getChiaFarmerAddonPath(clothesPath),
      zIndex: LAYER_Z_INDEX.ClothesAddon,
      layerName: 'ClothesAddon',
    });
  }

  // TysonTattoo
  if (hasTyson && hasMaskSelected && eyesPath) {
    layers.push({ path: eyesPath, zIndex: LAYER_Z_INDEX.TysonTattoo, layerName: 'TysonTattoo' });
  }

  // NinjaTurtleUnderMask
  if (hasNinja && maskCoversNinja && eyesPath) {
    // Gopher suit + Bandana: Ninja Turtle renders under both suit and bandana
    const ninjaUnderSuit = hasBandana && isGopherSuit(selectedLayers);
    const ninjaLayer: RenderLayer = {
      path: eyesPath,
      zIndex: ninjaUnderSuit ? LAYER_Z_INDEX.EyesUnderSuit : LAYER_Z_INDEX.NinjaTurtleUnderMask,
      layerName: 'NinjaTurtleUnderMask',
    };
    // Firefighter Helmet: clip left 28% even under mask
    if (isFirefighterHelmet(selectedLayers)) ninjaLayer.clipLeftPercent = 0.28;
    else if (isPirateHead(selectedLayers)) ninjaLayer.clipLeftPercent = 0.22;
    else if (hasRonin) ninjaLayer.clipLeftPercent = CLIP.NINJA_DEFAULT;
    layers.push(ninjaLayer);
  }

  // EyePatchUnderHannibal
  if (hasEyePatchSelected && hasHannibal && eyesPath) {
    if (hasSuitEyesUnder) {
      // Eye patch + Hannibal + suit: left 50% under suit, right 50% above suit (below Hannibal)
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesUnderSuit,
        layerName: 'EyesUnderSuit',
        clipRightPercent: CLIP.HALF,
      });
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyePatchUnderHannibal,
        layerName: 'EyePatchUnderHannibal',
        clipLeftPercent: CLIP.HALF,
      });
    } else {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyePatchUnderHannibal,
        layerName: 'EyePatchUnderHannibal',
      });
    }
  }

  // HannibalMask
  if (hasHannibal && !hasLayersAboveHead) {
    const maskPath = effectiveMaskPath;
    if (maskPath) {
      if (hasSuitEyesUnder) {
        // Hannibal + Bepe/Pepe/Gopher/PoP suit: left 50% under suit, right 50% on top
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.MaskUnderSuit,
          layerName: 'MaskUnderSuit',
          clipRightPercent: CLIP.HALF,
        });
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.HannibalMask,
          layerName: 'HannibalMask',
          clipLeftPercent: CLIP.HALF,
        });
      } else {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.HannibalMask,
          layerName: 'HannibalMask',
        });
      }
    }
  }

  // Rekt face + specific mouths: extra detail overlay on top of the face
  if (hasBubble && hasRekt) {
    layers.push({
      path: LOCAL_REKT_MOUTH_OVERLAYS.bubbleGum,
      zIndex: LAYER_Z_INDEX.RektMouthOverlay,
      layerName: 'BubbleGumRekt',
    });
  }
  if (hasRekt && pathContains(selectedLayers.MouthBase, 'Pipe')) {
    layers.push({
      path: LOCAL_REKT_MOUTH_OVERLAYS.pipe,
      zIndex: LAYER_Z_INDEX.RektMouthOverlay,
      layerName: 'PipeWhenRekt',
    });
  }

  // BubbleGumOverHead
  if (hasBubble && selectedLayers.Head) {
    const mouthBasePath = getBubbleGumRenderPath(selectedLayers, hasRekt);
    if (mouthBasePath) {
      layers.push({
        path: mouthBasePath,
        zIndex: LAYER_Z_INDEX.BubbleGumOverHead,
        layerName: 'BubbleGumOverHead',
      });
    }
  }

  // BubbleGumOverEyes
  if (hasBubble && eyesPath) {
    const mouthBasePath = getBubbleGumRenderPath(selectedLayers, hasRekt);
    if (mouthBasePath) {
      layers.push({
        path: mouthBasePath,
        zIndex: LAYER_Z_INDEX.BubbleGumOverEyes,
        layerName: 'BubbleGumOverEyes',
      });
    }
  }

  // Laser Eyes over BubbleGum: only eye trait that renders on top of bubble gum
  if (hasBubble && hasLaserEyesSelected && eyesPath) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.LaserEyesOverBubbleGum,
      layerName: 'LaserEyesOverBubbleGum',
    });
  }

  // Masks over Ronin Helmet: right 50% renders on top of the helmet
  if (hasRonin) {
    const maskPath = effectiveMaskPath;
    if (maskPath) {
      if (hasBandana) {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.BandanaMaskOverRonin,
          layerName: 'BandanaMaskOverRonin',
          clipRightHalf: true,
        });
      } else if (hasHannibal) {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.HannibalMaskOverRonin,
          layerName: 'HannibalMaskOverRonin',
          clipRightHalf: true,
        });
      } else if (hasCopium) {
        layers.push({
          path: maskPath,
          zIndex: LAYER_Z_INDEX.CopiumMaskOverRonin,
          layerName: 'CopiumMaskOverRonin',
          clipRightHalf: true,
        });
      }
    }
  }

  // NeckbeardOverRonin: right 50% of neckbeard on top of Ronin Helmet
  if (hasRonin) {
    const facialHairPath = selectedLayers.FacialHair;
    if (facialHairPath && pathContains(facialHairPath, 'neckbeard')) {
      layers.push({
        path: facialHairPath,
        zIndex: LAYER_Z_INDEX.NeckbeardOverRonin,
        layerName: 'NeckbeardOverRonin',
        clipLeftPercent: 0.5, // right 50% renders on top of helmet
      });

      // MouthBase and MouthItem must render on top of NeckbeardOverRonin
      const mouthBasePath = selectedLayers.MouthBase;
      if (mouthBasePath) {
        layers.push({
          path: mouthBasePath,
          zIndex: LAYER_Z_INDEX.MouthBaseOverNeckbeard,
          layerName: 'MouthBaseOverNeckbeard',
        });
      }
      const mouthItemPath = selectedLayers.MouthItem;
      if (mouthItemPath) {
        layers.push({
          path: mouthItemPath,
          zIndex: LAYER_Z_INDEX.MouthItemOverNeckbeard,
          layerName: 'MouthItemOverNeckbeard',
        });
      }
    }
  }

  // Copium mask on top of mouth and neckbeard when all are selected (e.g. Ronin + Copium + neckbeard + mouth)
  // Ronin case: CopiumMaskOverRonin is at 13.2; NeckbeardOverRonin at 13.5; Mouth*OverNeckbeard at 13.6/13.7.
  // Re-draw copium (right half) above those so the mask stays on top.
  if (hasRonin && hasCopium && hasNeckbeard(selectedLayers)) {
    const maskPathForCopium = effectiveMaskPath;
    if (maskPathForCopium) {
      layers.push({
        path: maskPathForCopium,
        zIndex: LAYER_Z_INDEX.CopiumMaskOverMouthAndNeckbeard,
        layerName: 'CopiumMaskOverMouthAndNeckbeard',
        clipRightHalf: true,
      });
    }
  }
  // Non-Ronin: main-loop Mask is at z 7 (above mouth 5/6 and facial hair 4), so copium is already on top.

  // MouthOverNeckbeard (general case, not Ronin which is handled above)
  // Ensures mouth traits always render on top of neckbeard
  if (hasNeckbeard(selectedLayers) && !hasRonin) {
    const mouthBasePath = selectedLayers.MouthBase;
    if (mouthBasePath) {
      layers.push({
        path: mouthBasePath,
        zIndex: LAYER_Z_INDEX.MouthBaseOverNeckbeardGeneral,
        layerName: 'MouthBaseOverNeckbeardGeneral',
      });
    }
    const mouthItemPath = selectedLayers.MouthItem;
    if (mouthItemPath) {
      layers.push({
        path: mouthItemPath,
        zIndex: LAYER_Z_INDEX.MouthItemOverNeckbeardGeneral,
        layerName: 'MouthItemOverNeckbeardGeneral',
      });
    }
  }

  // MouthOverPirateHead: Cig, Joint, Cohiba render on top of Pirate Hat
  if (isPirateHead(selectedLayers)) {
    const mouthBasePath = selectedLayers.MouthBase;
    if (mouthBasePath && isMouthOverPirate(mouthBasePath)) {
      layers.push({
        path: mouthBasePath,
        zIndex: LAYER_Z_INDEX.MouthOverPirateHead,
        layerName: 'MouthOverPirateHead',
      });
    }
    const mouthItemPath = selectedLayers.MouthItem;
    if (mouthItemPath && isMouthOverPirate(mouthItemPath)) {
      layers.push({
        path: mouthItemPath,
        zIndex: LAYER_Z_INDEX.MouthOverPirateHead + 0.1,
        layerName: 'MouthItemOverPirateHead',
      });
    }
  }

  // MouthOverRonin: All mouth layers render on top of Ronin Helmet
  if (hasRonin) {
    const mouthBasePath = selectedLayers.MouthBase;
    if (mouthBasePath) {
      layers.push({
        path: mouthBasePath,
        zIndex: LAYER_Z_INDEX.MouthBaseOverRonin,
        layerName: 'MouthBaseOverRonin',
      });
    }
    const mouthItemPath = selectedLayers.MouthItem;
    if (mouthItemPath) {
      layers.push({
        path: mouthItemPath,
        zIndex: LAYER_Z_INDEX.MouthItemOverRonin,
        layerName: 'MouthItemOverRonin',
      });
    }
  }

  // EyesOverHead
  if ((needsEyesOverlay || (hasSwat && isVRHeadset(eyesPath))) && eyesPath && !hasTyson && !hasNinja) {
    // Pirate Hat + Night Vision: right half + clip top 32.7% via polygon
    if (isPirateHead(selectedLayers) && isNightVision(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipPolygon: [[0.5, 0.327], [1, 0.327], [1, 1], [0.5, 1]],
      });
    // Ronin Helmet + Night Vision: right half + clip top 35.2% via polygon
    } else if (hasRonin && isNightVision(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipPolygon: [[0.5, 0.352], [1, 0.352], [1, 1], [0.5, 1]],
      });
    // Ronin Helmet + VR Headset: left 34% under the helmet, rest on top
    } else if (hasRonin && isVRHeadset(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipLeftPercent: 0.34,
      });
    // Tinfoil Head + VR Headset: full VR headset renders on top
    } else if (isTinfoilHead(selectedLayers) && isVRHeadset(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
      });
    // Tin Foil Hat + Night Vision: crop left 25.5% and top 26.4%
    } else if (isTinfoilHead(selectedLayers) && isNightVision(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipPolygon: [[0.255, 0.264], [1, 0.264], [1, 1], [0.255, 1]],
      });
    // Propeller Hat + Night Vision: crop top 20.4%
    } else if (isPropellerHat(selectedLayers) && isNightVision(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipPolygon: [[0, 0.204], [1, 0.204], [1, 1], [0, 1]],
      });
    // Beanie + Night Vision: crop left 28.2% and top 26%
    } else if (isBeanieHead(selectedLayers) && isNightVision(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipPolygon: [[0.282, 0.26], [1, 0.26], [1, 1], [0.282, 1]],
      });
    // Beanie + VR Headset: full VR headset renders on top
    } else if (isBeanieHead(selectedLayers) && isVRHeadset(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
      });
    // SWAT Helmet + VR Headset: right 35% on top of helmet
    } else if (hasSwat && isVRHeadset(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipLeftPercent: 0.65,
      });
    // Super Saiyan + Night Vision / Eye Patch: skip EyesOverHead so Saiyan hair renders on top
    } else if (isSuperSaiyan(selectedLayers) && (isNightVision(eyesPath) || isEyePatch(eyesPath))) {
      // No EyesOverHead - stays fully under Saiyan hair at default Eyes z-index
    } else {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverHead,
        layerName: 'EyesOverHead',
        clipRightHalf: true,
      });
    }
  }

  // Pirate Hat + VR Headset / 3D Glasses: left 32% also above the hat (in addition to the normal right-half EyesOverHead)
  if (needsEyesOverlay && eyesPath && isPirateHead(selectedLayers) && (isVRHeadset(eyesPath) || is3DGlasses(eyesPath))) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.EyesOverHead,
      layerName: 'EyesOverHeadLeft',
      clipRightPercent: 1 - 0.32,
    });
  }

  // Pirate Hat + Ninja Turtle: right 50% above the hat (left 22% already cropped in Eyes case)
  if (isPirateHead(selectedLayers) && hasNinja && eyesPath) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.EyesOverHead,
      layerName: 'EyesOverHead',
      clipLeftPercent: CLIP.HALF,
    });
  }

  // Clown Hair + Ninja Turtle: right 50% above the clown hair
  if (pathContains(selectedLayers.Head, 'clown') && hasNinja && eyesPath) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.EyesOverHead,
      layerName: 'EyesOverHead',
      clipLeftPercent: CLIP.HALF,
    });
  }

  // EyesOverStandardCut (or EyesUnderStandardCut for Night Vision + Trump Wave)
  // Skip when MOG + Copium: MOG will be drawn at MogGlassesOverCopium (z 17) instead
  const skipEyesOverStandardCut = isMogGlasses(eyesPath) && hasCopium;
  if (hasLayersAboveHead && eyesPath && !hasTyson && !hasNinja && !hasAstronaut && !hasEyePatchSelected && !skipEyesOverStandardCut) {
    // Trump Wave + Night Vision: crop left 28.5% and top 17.8%, render UNDER hair
    if (isTrumpWave(selectedLayers) && isNightVision(eyesPath)) {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesUnderStandardCut,
        layerName: 'EyesUnderStandardCut',
        clipPolygon: [[0.285, 0.178], [1, 0.178], [1, 1], [0.285, 1]],
      });
    } else {
      layers.push({
        path: eyesPath,
        zIndex: LAYER_Z_INDEX.EyesOverStandardCut,
        layerName: 'EyesOverStandardCut',
      });
    }
  }

  // MaskOverStandardCut
  if (hasLayersAboveHead && (hasHannibal || hasCopium)) {
    const maskPath = effectiveMaskPath;
    if (maskPath) {
      layers.push({
        path: maskPath,
        zIndex: LAYER_Z_INDEX.MaskOverStandardCut,
        layerName: 'MaskOverStandardCut',
      });
    }
  }

  // FullFaceMask
  if (hasFullFaceMask) {
    const maskPath = effectiveMaskPath;
    if (maskPath) {
      layers.push({
        path: maskPath,
        zIndex: LAYER_Z_INDEX.FullFaceMask,
        layerName: 'FullFaceMask',
      });
    }
  }

  // MOG Glasses always renders on top of Copium Mask
  const hasMogGlasses = isMogGlasses(eyesPath);
  if (hasMogGlasses && hasCopium && eyesPath) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.MogGlassesOverCopium,
      layerName: 'MogGlassesOverCopium',
    });
  }

  // Trump Hair renders on top of everything when combined with MOG + Copium
  const hasTrump = isTrumpHair(selectedLayers);
  if (hasTrump && hasMogGlasses && hasCopium) {
    const headPath = selectedLayers.Head;
    if (headPath) {
      layers.push({
        path: headPath,
        zIndex: LAYER_Z_INDEX.TrumpHairOverAll,
        layerName: 'TrumpHairOverAll',
      });
    }
  }

  // Extra1, Extra2, Extra3 (hand items + wings) — multi-select extra accessories.
  // Also recover gracefully if a broken state stored an extra path in Mask.
  const extraPaths = new Set<string>();
  for (const extraKey of ['Extra1', 'Extra2', 'Extra3'] as const) {
    const extraPath = selectedLayers[extraKey];
    if (isSelectionPathEmpty(extraPath)) continue;
    extraPaths.add(extraPath as string);
  }
  if (isExtraAccessoryPath(selectedLayers.Mask) && !isSelectionPathEmpty(selectedLayers.Mask)) {
    extraPaths.add(selectedLayers.Mask as string);
  }

  for (const path of extraPaths) {
    const isWings = isWingsExtraPath(path);
    layers.push({
      path,
      zIndex: isWings ? LAYER_Z_INDEX.ExtraWings : LAYER_Z_INDEX.ExtraHands,
      layerName: isWings ? 'ExtraWings' : 'ExtraHands',
    });
  }

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}
