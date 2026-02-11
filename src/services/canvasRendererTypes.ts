/**
 * Shared types for the canvas renderer pipeline (layer builder and draw).
 */

export type G2DrawItem =
  | { type: 'fill'; file: string; color: string; noTint?: boolean; opacity?: number }
  | { type: 'outline'; path: string };

export interface G2LayerData {
  fills: { file: string; color: string; noTint?: boolean; flatTint?: boolean }[];
  outlines: string[];
  /** Render at 2x then scale down to reduce pixelation (Centurion plume) */
  supersample?: boolean;
  orderedDrawItems?: G2DrawItem[];
  detail?: string;
  /** Multiple detail overlays (e.g. Construction Helmet: Chia + cig pack) */
  details?: string[];
  frame?: string;
  logoOption?: string;
  /** When set, use this position for the coin logo instead of default Astronaut position */
  logoPos?: { cx: number; cy: number; r: number };
  /** Frame drawn on top of the logo (e.g. Wizard patch frame) */
  logoFrame?: string;
  flagOption?: string;
  frame1?: string;
  frame2?: string;
  detailOverlay?: string;
  name1?: string;
  name2?: string;
}

export interface RenderLayer {
  path: string;
  zIndex: number;
  layerName: string;
  clipRightHalf?: boolean;
  clipLeftPercent?: number;
  /** Skip right X% (0-1); show left portion. e.g. 0.5 = left half only */
  clipRightPercent?: number;
  /** Restrict clip to top 50% of canvas only (for Beer Hat right-behind) */
  clipTopHalfOnly?: boolean;
  /** Top half: left portion; bottom half: full width (for Beer Hat on-top) */
  clipBottomHalfFull?: boolean;
  g2?: G2LayerData;
  fillPath?: string;
  outlinePath?: string;
  color?: string;
}

export interface RenderResult {
  dataUrl: string;
  width: number;
  height: number;
}
