/**
 * Gallery Components
 *
 * Export all gallery-related components.
 */

// Mobile/shared components
export { CharacterCard } from './CharacterCard';
export { CharacterGrid } from './CharacterGrid';
export { NFTExplorerModal } from './NFTExplorerModal';
export { SwipeableNFTImage } from './SwipeableNFTImage';
export { ExplorerTopBar } from './ExplorerTopBar';
export { FilterPills } from './FilterPills';
export { NFTInfoCard } from './NFTInfoCard';

// Responsive wrapper
export { ResponsiveExplorer } from './ResponsiveExplorer';

// Desktop components (DesktopExplorerPanel excluded - lazy loaded by ResponsiveExplorer)
export {
  DesktopCharacterCard,
  DesktopCharacterGrid,
  DesktopNFTImage,
  ThumbnailStrip,
  ExplorerOverlay,
} from './desktop';
