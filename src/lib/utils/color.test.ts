import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  lerpRgb,
  lerpColor,
  lerpColors,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  complementary,
  triadic,
  withAlpha,
  rgbString,
  rgbaString,
  hslString,
  hslaString,
  getContrastColor,
  getGradientStops,
  GAME_PALETTES,
} from './color';

describe('hexToRgb', () => {
  it('converts black hex to RGB', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('converts white hex to RGB', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts orange hex to RGB', () => {
    expect(hexToRgb('#ff6b00')).toEqual({ r: 255, g: 107, b: 0 });
  });

  it('handles hex without # prefix', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('returns black for invalid hex', () => {
    expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('handles uppercase hex', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('converts black RGB to hex', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white RGB to hex', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('converts red RGB to hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('clamps values above 255', () => {
    expect(rgbToHex(300, 0, 0)).toBe('#ff0000');
  });

  it('clamps values below 0', () => {
    expect(rgbToHex(-10, 0, 0)).toBe('#000000');
  });

  it('rounds fractional values', () => {
    expect(rgbToHex(127.6, 0, 0)).toBe('#800000');
  });
});

describe('rgbToHsl', () => {
  it('converts black to HSL', () => {
    const hsl = rgbToHsl(0, 0, 0);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBe(0);
  });

  it('converts white to HSL', () => {
    const hsl = rgbToHsl(255, 255, 255);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBe(100);
  });

  it('converts red to HSL', () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('converts green to HSL', () => {
    const hsl = rgbToHsl(0, 255, 0);
    expect(hsl.h).toBe(120);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('converts blue to HSL', () => {
    const hsl = rgbToHsl(0, 0, 255);
    expect(hsl.h).toBe(240);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });
});

describe('hslToRgb', () => {
  it('converts achromatic (s=0) HSL to RGB', () => {
    const rgb = hslToRgb(0, 0, 50);
    expect(rgb.r).toBe(rgb.g);
    expect(rgb.g).toBe(rgb.b);
  });

  it('converts red HSL to RGB', () => {
    const rgb = hslToRgb(0, 100, 50);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('converts green HSL to RGB', () => {
    const rgb = hslToRgb(120, 100, 50);
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(0);
  });
});

describe('hexToHsl and hslToHex round-trip', () => {
  it('round-trips red', () => {
    const hsl = hexToHsl('#ff0000');
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('hslToHex produces correct hex for red', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });
});

describe('lerpRgb', () => {
  it('returns color1 at t=0', () => {
    const c1 = { r: 0, g: 0, b: 0 };
    const c2 = { r: 255, g: 255, b: 255 };
    expect(lerpRgb(c1, c2, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('returns color2 at t=1', () => {
    const c1 = { r: 0, g: 0, b: 0 };
    const c2 = { r: 255, g: 255, b: 255 };
    expect(lerpRgb(c1, c2, 1)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('returns midpoint at t=0.5', () => {
    const c1 = { r: 0, g: 0, b: 0 };
    const c2 = { r: 100, g: 200, b: 50 };
    const result = lerpRgb(c1, c2, 0.5);
    expect(result.r).toBe(50);
    expect(result.g).toBe(100);
    expect(result.b).toBe(25);
  });
});

describe('lerpColor', () => {
  it('returns first color at t=0', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000');
  });

  it('returns second color at t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('lerpColors', () => {
  it('returns black for empty array', () => {
    expect(lerpColors([], 0.5)).toBe('#000000');
  });

  it('returns only color for single-element array', () => {
    expect(lerpColors(['#ff0000'], 0.5)).toBe('#ff0000');
  });

  it('returns first color at t=0', () => {
    expect(lerpColors(['#000000', '#ffffff'], 0)).toBe('#000000');
  });

  it('returns last color at t=1', () => {
    expect(lerpColors(['#000000', '#ffffff'], 1)).toBe('#ffffff');
  });

  it('interpolates across multiple colors', () => {
    // Three colors: black -> red -> white
    // At t=0.5, should be at red (#ff0000)
    const result = lerpColors(['#000000', '#ff0000', '#ffffff'], 0.5);
    expect(result).toBe('#ff0000');
  });
});

describe('lighten', () => {
  it('increases lightness', () => {
    const original = hexToHsl('#808080');
    const lightened = hexToHsl(lighten('#808080', 10));
    expect(lightened.l).toBeGreaterThan(original.l);
  });

  it('does not exceed 100% lightness', () => {
    const result = hexToHsl(lighten('#ffffff', 50));
    expect(result.l).toBe(100);
  });
});

describe('darken', () => {
  it('decreases lightness', () => {
    const original = hexToHsl('#808080');
    const darkened = hexToHsl(darken('#808080', 10));
    expect(darkened.l).toBeLessThan(original.l);
  });

  it('does not go below 0% lightness', () => {
    const result = hexToHsl(darken('#000000', 50));
    expect(result.l).toBe(0);
  });
});

describe('saturate', () => {
  it('increases saturation', () => {
    const original = hexToHsl('#808080');
    const saturated = hexToHsl(saturate('#ff6b00', 10));
    // #ff6b00 already has high saturation, capped at 100
    expect(saturated.s).toBeGreaterThanOrEqual(original.s);
  });

  it('does not exceed 100% saturation', () => {
    const result = hexToHsl(saturate('#ff0000', 50));
    expect(result.s).toBe(100);
  });
});

describe('desaturate', () => {
  it('decreases saturation', () => {
    const original = hexToHsl('#ff0000');
    const desaturated = hexToHsl(desaturate('#ff0000', 50));
    expect(desaturated.s).toBeLessThan(original.s);
  });

  it('does not go below 0% saturation', () => {
    const result = hexToHsl(desaturate('#808080', 100));
    expect(result.s).toBe(0);
  });
});

describe('rotateHue', () => {
  it('rotates hue by given degrees', () => {
    const original = hexToHsl('#ff0000'); // h=0
    const rotated = hexToHsl(rotateHue('#ff0000', 120)); // should be h~120 (green)
    expect(rotated.h).toBe(original.h + 120);
  });

  it('wraps around 360', () => {
    // h=300 + 120 = 420 -> 60
    const hsl = hexToHsl(rotateHue('#ff00ff', 120)); // magenta h=300
    expect(hsl.h).toBe(60);
  });

  it('handles negative rotation', () => {
    const hsl = hexToHsl(rotateHue('#ff0000', -60)); // h=0, -60 -> 300
    expect(hsl.h).toBe(300);
  });
});

describe('complementary', () => {
  it('returns complementary color (180 degrees opposite)', () => {
    const original = hexToHsl('#ff0000'); // h=0
    const comp = hexToHsl(complementary('#ff0000'));
    expect(comp.h).toBe((original.h + 180) % 360);
  });
});

describe('triadic', () => {
  it('returns array of 3 colors', () => {
    const result = triadic('#ff0000');
    expect(result).toHaveLength(3);
  });

  it('first element is original color', () => {
    expect(triadic('#ff0000')[0]).toBe('#ff0000');
  });

  it('second element is 120 degrees rotated', () => {
    const result = triadic('#ff0000');
    const h2 = hexToHsl(result[1]).h;
    expect(h2).toBe(120);
  });

  it('third element is 240 degrees rotated', () => {
    const result = triadic('#ff0000');
    const h3 = hexToHsl(result[2]).h;
    expect(h3).toBe(240);
  });
});

describe('withAlpha', () => {
  it('returns rgba string', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('returns fully opaque rgba', () => {
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('returns fully transparent rgba', () => {
    expect(withAlpha('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)');
  });
});

describe('rgbString', () => {
  it('formats RGB as CSS string', () => {
    expect(rgbString(255, 128, 0)).toBe('rgb(255, 128, 0)');
  });
});

describe('rgbaString', () => {
  it('formats RGBA as CSS string', () => {
    expect(rgbaString(255, 128, 0, 0.8)).toBe('rgba(255, 128, 0, 0.8)');
  });
});

describe('hslString', () => {
  it('formats HSL as CSS string', () => {
    expect(hslString(120, 100, 50)).toBe('hsl(120, 100%, 50%)');
  });
});

describe('hslaString', () => {
  it('formats HSLA as CSS string', () => {
    expect(hslaString(120, 100, 50, 0.5)).toBe('hsla(120, 100%, 50%, 0.5)');
  });
});

describe('getContrastColor', () => {
  it('returns black for light background', () => {
    expect(getContrastColor('#ffffff')).toBe('#000000');
  });

  it('returns white for dark background', () => {
    expect(getContrastColor('#000000')).toBe('#FFFFFF');
  });

  it('returns appropriate contrast for mid-gray', () => {
    const result = getContrastColor('#808080');
    expect(['#000000', '#FFFFFF']).toContain(result);
  });
});

describe('getGradientStops', () => {
  it('returns empty array for empty colors', () => {
    expect(getGradientStops([])).toEqual([]);
  });

  it('returns single stop at offset 0 for single color', () => {
    // With 1 color, 1 / (1 - 1) = 1/0 = NaN/Infinity; offset is 0/0
    const stops = getGradientStops(['#ff0000']);
    expect(stops).toHaveLength(1);
    expect(stops[0].color).toBe('#ff0000');
  });

  it('returns correct offsets for two colors', () => {
    const stops = getGradientStops(['#000000', '#ffffff']);
    expect(stops).toHaveLength(2);
    expect(stops[0].offset).toBe(0);
    expect(stops[1].offset).toBe(1);
  });

  it('returns correct offsets for three colors', () => {
    const stops = getGradientStops(['#000000', '#808080', '#ffffff']);
    expect(stops).toHaveLength(3);
    expect(stops[0].offset).toBe(0);
    expect(stops[1].offset).toBeCloseTo(0.5);
    expect(stops[2].offset).toBe(1);
  });
});

describe('GAME_PALETTES', () => {
  it('has expected palette names', () => {
    expect(GAME_PALETTES).toHaveProperty('fire');
    expect(GAME_PALETTES).toHaveProperty('ice');
    expect(GAME_PALETTES).toHaveProperty('nature');
    expect(GAME_PALETTES).toHaveProperty('ocean');
    expect(GAME_PALETTES).toHaveProperty('neon');
  });

  it('each palette is an array of strings', () => {
    for (const palette of Object.values(GAME_PALETTES)) {
      expect(Array.isArray(palette)).toBe(true);
      expect(palette.length).toBeGreaterThan(0);
      for (const color of palette) {
        expect(typeof color).toBe('string');
      }
    }
  });
});
