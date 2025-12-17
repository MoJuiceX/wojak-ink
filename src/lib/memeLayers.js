/**
 * CANONICAL FACE RENDER ORDER (top → bottom):
 * 1. Head/Base Face
 * 2. Eyes
 * 3. Mask (ALL masks including Copium)
 * 4. Tyson Tattoo (virtual layer, extracted from Eyes, ONLY if Hannibal Mask exists)
 * 5. Hannibal Mask (virtual layer, extracted from Mask)
 * 6. Mouth(Item)
 * 7. Mouth(Base) - ALL traits including Screaming (normal layer)
 * 8. Astronaut (virtual layer, extracted from Clothes)
 * 9. Facial Hair
 * 
 * ABSOLUTE RULES (NON-NEGOTIABLE):
 * - Head: MUST ALWAYS render OVER Mask (Head overlays mask)
 * - Head: MUST ALWAYS render OVER Eyes (Head overlays eyes)
 * - Mask: MUST ALWAYS render BEFORE Eyes (Eyes overlay all masks)
 * - Eyes: MUST ALWAYS render OVER ALL Mask traits (Eyes overlay all masks)
 * - Mask: MUST ALWAYS render AFTER Mouth(Base) and Mouth(Item) (Mask overlays mouth layers)
 * - Mouth(Base): MUST ALWAYS render BEFORE Mask (Mask overlays mouth base)
 * - Mouth(Item): MUST ALWAYS render BEFORE Mask (Mask overlays mouth item)
 * - Mouth(Item): MUST ALWAYS render AFTER Mouth(Base) (MouthItem overlays MouthBase)
 * - Facial Hair: MUST ALWAYS render UNDER Mouth(Base) and Mouth(Item) (Mouth on top)
 * - Facial Hair: MUST ALWAYS render UNDER Astronaut (Astronaut covers facial hair)
 * - Mouth(Item): Always renders AFTER FacialHair (Mouth on top)
 * - Mouth(Base): Always renders AFTER FacialHair (Mouth on top)
 * - Mouth(Base): ALL traits (including Screaming) render BEFORE Astronaut (Astronaut covers all mouth bases)
 * - Hannibal Mask: MUST ALWAYS render OVER Mouth(Base) and Mouth(Item)
 * - Tyson Tattoo: ONLY allowed directly under Hannibal Mask, NEVER above Eyes, NEVER below Mouth, NEVER exists without Hannibal Mask
 * - Eyes: Renders before Head (Head overlays eyes)
 * - Eyes: Renders before Astronaut (Astronaut covers eyes)
 * - Astronaut: MUST ALWAYS render OVER Eyes (Astronaut covers eyes)
 * - Astronaut: MUST ALWAYS render OVER Facial Hair (Astronaut covers facial hair)
 * - Astronaut: MUST ALWAYS render OVER ALL Mouth(Base) traits including Screaming (Astronaut covers all mouths)
 * 
 * RENDER ORDER VERIFICATION (bottom → top, as rendered):
 * - FacialHair renders BEFORE MouthBase (Mouth overlays FacialHair) ✓
 * - MouthBase renders BEFORE MouthItem (MouthItem overlays MouthBase) ✓
 * - MouthBase renders BEFORE Mask (Mask overlays MouthBase) ✓
 * - MouthItem renders BEFORE Mask (Mask overlays MouthItem) ✓
 * - Mask (ALL masks including Copium) renders BEFORE Eyes (Eyes overlay all masks) ✓
 * - Eyes renders BEFORE Head (Head overlays Eyes) ✓
 * - FacialHair renders BEFORE Astronaut (Astronaut overlays FacialHair) ✓
 * - MouthBase (ALL traits including Screaming) renders BEFORE Astronaut (Astronaut overlays all mouths) ✓
 */
export const LAYER_ORDER = [
  { name: 'Background', folder: 'BACKGROUND', zIndex: 0 },
  { name: 'Base', folder: 'BASE', zIndex: 1 },
  { name: 'Clothes', folder: 'CLOTHES', zIndex: 2 }, // Base clothes layer (Astronaut extracted to virtual layer)
  { name: 'ClothesAddon', folder: 'CLOTHESADDON', zIndex: 3 }, // Internal layer for Chia Farmer (shown in Clothes dropdown)
  { name: 'FacialHair', folder: 'FACIALHAIR', zIndex: 4 }, // MUST ALWAYS render UNDER Astronaut, Mouth(Base), and Mouth(Item)
  { name: 'MouthBase', folder: 'MOUTHBASE', zIndex: 5 }, // ALL Mouth(Base) traits including Screaming (renders before Mask and Astronaut)
  { name: 'MouthItem', folder: 'MOUTHITEM', zIndex: 6 }, // Renders after MouthBase (MouthItem overlays MouthBase), before Mask (Mask overlays MouthItem)
  { name: 'Mask', folder: 'MASK', zIndex: 7 }, // ALL masks including Copium (renders after MouthBase and MouthItem so Mask overlays mouth layers, before Eyes so Eyes overlay Mask)
  { name: 'Eyes', folder: 'EYE', zIndex: 8 }, // Renders after Mask (Eyes overlay all masks), before Head (Head overlays eyes), before Astronaut (Astronaut covers eyes)
  { name: 'Astronaut', folder: 'ASTRONAUT', zIndex: 9 }, // Virtual layer: MUST ALWAYS render OVER Eyes, FacialHair, and ALL Mouth(Base) traits
  { name: 'HannibalMask', folder: 'HANNIBALMASK', zIndex: 10 }, // Virtual layer: MUST ALWAYS render OVER Mouth(Base) and Mouth(Item)
  { name: 'TysonTattoo', folder: 'TYSONTATTOO', zIndex: 11 }, // Virtual layer: ONLY allowed directly under Hannibal Mask, NEVER above Eyes, NEVER below Mouth
  { name: 'Head', folder: 'HEAD', zIndex: 12 }, // MUST ALWAYS render OVER Eyes and Mask (Head overlays eyes and mask)
]

// Layers that should appear in the UI (excludes Extra, ClothesAddon, and virtual layers)
export const UI_LAYER_ORDER = LAYER_ORDER.filter(layer => 
  layer.name !== 'Extra' && 
  layer.name !== 'ClothesAddon' && 
  layer.name !== 'HannibalMask' && 
  layer.name !== 'TysonTattoo' &&
  layer.name !== 'Astronaut'
)

export const LAYER_NAMES = LAYER_ORDER.map(layer => layer.name)
export const UI_LAYER_NAMES = UI_LAYER_ORDER.map(layer => layer.name)

