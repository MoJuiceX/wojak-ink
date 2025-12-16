export const LAYER_ORDER = [
  { name: 'Background', folder: 'BACKGROUND', zIndex: 0 },
  { name: 'Base', folder: 'BASE', zIndex: 1 },
  { name: 'Clothes', folder: 'CLOTHES', zIndex: 2 },
  { name: 'Eyes', folder: 'EYE', zIndex: 3 },
  { name: 'Head', folder: 'HEAD', zIndex: 4 },
  { name: 'Mouth', folder: 'MOUTH', zIndex: 5 },
  { name: 'Extra', folder: 'EXTRA', zIndex: 6 },
]

export const LAYER_NAMES = LAYER_ORDER.map(layer => layer.name)

