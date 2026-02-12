/**
 * Canvas renderer layer builder: builds the flat list of render layers from selections.
 * Single place for all virtual-layer logic (Astronaut, ClothesAddon, BubbleGumRekt, etc.)
 * and path-based condition helpers. To add a virtual layer, add the condition and push here;
 * see docs/GENERATOR-CHECKLIST.md. G2 composite expansion remains in the main renderer.
 */

import type { SelectedLayers } from '@/lib/wojakRules';
import { RENDER_ORDER } from '@/lib/layerRegistry';
import {
  LAYER_Z_INDEX,
  MOUTH_OVER_CENTURION,
  NINJA_COVERING_MASKS,
  FULL_FACE_MASKS,
  HEADS_NEEDING_EYES_OVERLAY,
  SUITS_NEEDING_EYES_UNDER,
} from '@/services/canvasRendererConstants';
import type { RenderLayer } from '@/services/canvasRendererTypes';

/**
 * Night Vision visor polygon (normalized 0-1 coords on 1000x1000 canvas).
 * Only this area renders above the Goose suit; strap/band renders under.
 */
const NIGHT_VISION_VISOR_POLYGON: [number, number][] = [
  [0.47, 0.33],   // top-left
  [0.88, 0.33],   // top-right
  [0.88, 0.53],   // bottom-right
  [0.47, 0.53],   // bottom-left
];

// ============ Helpers ============

function pathContains(path: string | undefined, identifier: string): boolean {
  if (!path) return false;
  return path.toLowerCase().includes(identifier.toLowerCase());
}

function isCenturionSelected(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'centurion');
}

function isMouthOverCenturion(path: string): boolean {
  return MOUTH_OVER_CENTURION.some((trait) => pathContains(path, trait));
}

function hasMask(selectedLayers: SelectedLayers): boolean {
  const maskPath = selectedLayers.Mask;
  return !!maskPath && maskPath !== '' && maskPath !== 'None';
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

function isRektBase(selectedLayers: SelectedLayers): boolean {
  const basePath = selectedLayers.Base;
  if (!basePath) return false;
  return pathContains(basePath, 'rekt') && !pathContains(basePath, 'rugged');
}

function hasBubbleGum(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.MouthBase, 'Bubble-Gum');
}

function hasRoninHelmet(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Head, 'ronin');
}

function hasBandanaMask(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Mask, 'bandana');
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
  const maskPath = selectedLayers.Mask;
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
  return pathContains(selectedLayers.Mask, 'hannibal');
}

function isCopiumMask(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Mask, 'copium');
}

function needsLayersAboveHead(selectedLayers: SelectedLayers): boolean {
  const headPath = selectedLayers.Head;
  if (!headPath) return false;
  const isStandardCut = pathContains(headPath, 'standard') && pathContains(headPath, 'cut');
  const isTrumpWave = pathContains(headPath, 'trump') && pathContains(headPath, 'wave');
  return isStandardCut || isTrumpWave;
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

function isNightVision(path: string | undefined): boolean {
  if (!path) return false;
  return pathContains(path, 'night-vision') || pathContains(path, 'nightvision');
}

function isGooseSuit(selectedLayers: SelectedLayers): boolean {
  return pathContains(selectedLayers.Clothes, 'goose-suit');
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
export function buildRenderLayers(selectedLayers: SelectedLayers): RenderLayer[] {
  const layers: RenderLayer[] = [];

  const hasCenturion = isCenturionSelected(selectedLayers);
  const centurionMaskVariant = needsCenturionMaskVariant(selectedLayers);
  const hasRekt = isRektBase(selectedLayers);
  const hasBubble = hasBubbleGum(selectedLayers);
  const hasRonin = hasRoninHelmet(selectedLayers);
  const hasBandanaRaw = hasBandanaMask(selectedLayers);
  // Bandana is effectively absent when an incompatible suit suppresses it
  const hasBandana = hasBandanaRaw && !isSuitIncompatibleWithBandana(selectedLayers);
  const hasAstronaut = isAstronautSelected(selectedLayers);
  const eyesPath = selectedLayers.Eyes;
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
  const hasFullFaceMask = isFullFaceMask(selectedLayers.Mask);
  const hasSuitEyesUnder = !hasAstronaut && isSuitNeedingEyesUnder(selectedLayers);

  for (const layerName of RENDER_ORDER) {
    let path = selectedLayers[layerName];
    if (!path || path === '' || path === 'None') continue;

    let zIndex = LAYER_Z_INDEX[layerName];
    let skipLayer = false;

    switch (layerName) {
      case 'Clothes':
        if (hasAstronaut) skipLayer = true;
        break;

      case 'Head':
        if (hasAstronaut) skipLayer = true;
        if (hasCenturion && centurionMaskVariant) path = getCenturionPath(path, true);
        break;

      case 'Mask':
        if (hasFullFaceMask) skipLayer = true;
        else if (hasAstronaut) skipLayer = true;
        else if (hasHannibal) skipLayer = true;
        else if (hasCopium && hasLayersAboveHead) skipLayer = true;
        // Bandana + incompatible suit (Sonic, Pickle, Goose): skip entirely
        else if (hasBandanaRaw && isSuitIncompatibleWithBandana(selectedLayers)) skipLayer = true;
        // Bandana + other suit: left 37% under suit, right 63% at normal Mask z (above suit, below eyes)
        else if (hasBandana && hasSuitEyesUnder) {
          layers.push({
            path,
            zIndex: LAYER_Z_INDEX.MaskUnderSuit,
            layerName: 'MaskUnderSuit',
            clipRightPercent: 0.63,
          });
          layers.push({
            path,
            zIndex,
            layerName: 'Mask',
            clipLeftPercent: 0.37,
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
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.25 });
          skipLayer = true;
          break;
        }
        if (hasNinja && hasRonin) {
          layers.push({ path, zIndex, layerName, clipLeftPercent: 0.25 });
          skipLayer = true;
          break;
        }
        if (hasTyson && hasMaskSelected) skipLayer = true;
        if (hasNinja && maskCoversNinja) skipLayer = true;
        if (hasEyePatchSelected && hasHannibal) skipLayer = true;
        if (hasLayersAboveHead && !hasEyePatchSelected) skipLayer = true;
        // Ninja Turtle + any full-body suit: render under suit with left side cut out
        if (!skipLayer && hasNinja && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipLeftPercent: 0.25,
          });
          skipLayer = true;
        }
        // Night Vision + Goose suit: visor area above suit, strap/band under suit
        if (!skipLayer && isNightVision(eyesPath) && isGooseSuit(selectedLayers) && eyesPath) {
          // Full image under the suit
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
          });
          // Visor polygon above the suit (only the goggle lens area shows through)
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipPolygon: NIGHT_VISION_VISOR_POLYGON,
          });
          skipLayer = true;
        }
        // Full-body suits: left 63% of eyes under suit, right 37% at normal Eyes z (above masks and suit)
        if (!skipLayer && hasSuitEyesUnder && eyesPath) {
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.EyesUnderSuit,
            layerName: 'EyesUnderSuit',
            clipRightPercent: 0.37,
          });
          layers.push({
            path: eyesPath,
            zIndex: LAYER_Z_INDEX.Eyes,
            layerName: 'EyesOverSuit',
            clipLeftPercent: 0.63,
          });
          skipLayer = true;
        }
        break;

      case 'FacialHair':
        if (hasCenturion && pathContains(path, 'stach')) zIndex = LAYER_Z_INDEX.Head + 1;
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
    const maskPath = selectedLayers.Mask;
    if (maskPath && maskPath !== '' && maskPath !== 'None' && !hasFullFaceMask) {
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
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.NinjaTurtleUnderMask,
      layerName: 'NinjaTurtleUnderMask',
    });
  }

  // EyePatchUnderHannibal
  if (hasEyePatchSelected && hasHannibal && eyesPath) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.EyePatchUnderHannibal,
      layerName: 'EyePatchUnderHannibal',
    });
  }

  // HannibalMask
  if (hasHannibal && !hasLayersAboveHead) {
    const maskPath = selectedLayers.Mask;
    if (maskPath) {
      layers.push({
        path: maskPath,
        zIndex: LAYER_Z_INDEX.HannibalMask,
        layerName: 'HannibalMask',
      });
    }
  }

  // BubbleGumRekt
  if (hasBubble && hasRekt) {
    layers.push({
      path: '/assets/wojak-layers/MOUTH/MOUTH_Bubble-Gum_rekt.png',
      zIndex: LAYER_Z_INDEX.BubbleGumRekt,
      layerName: 'BubbleGumRekt',
    });
  }

  // BubbleGumOverEyes
  if (hasBubble && eyesPath) {
    const mouthBasePath = selectedLayers.MouthBase;
    if (mouthBasePath) {
      layers.push({
        path: mouthBasePath,
        zIndex: LAYER_Z_INDEX.BubbleGumOverEyes,
        layerName: 'BubbleGumOverEyes',
      });
    }
  }

  // BandanaMaskOverRonin
  if (hasBandana && hasRonin) {
    const maskPath = selectedLayers.Mask;
    if (maskPath) {
      layers.push({
        path: maskPath,
        zIndex: LAYER_Z_INDEX.BandanaMaskOverRonin,
        layerName: 'BandanaMaskOverRonin',
        clipRightHalf: true,
      });
    }
  }

  // EyesOverHead
  if (needsEyesOverlay && eyesPath && !hasTyson && !hasNinja) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.EyesOverHead,
      layerName: 'EyesOverHead',
      clipRightHalf: true,
    });
  }

  // EyesOverStandardCut
  if (hasLayersAboveHead && eyesPath && !hasTyson && !hasNinja && !hasAstronaut && !hasEyePatchSelected) {
    layers.push({
      path: eyesPath,
      zIndex: LAYER_Z_INDEX.EyesOverStandardCut,
      layerName: 'EyesOverStandardCut',
    });
  }

  // MaskOverStandardCut
  if (hasLayersAboveHead && (hasHannibal || hasCopium)) {
    const maskPath = selectedLayers.Mask;
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
    const maskPath = selectedLayers.Mask;
    if (maskPath) {
      layers.push({
        path: maskPath,
        zIndex: LAYER_Z_INDEX.FullFaceMask,
        layerName: 'FullFaceMask',
      });
    }
  }

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}
