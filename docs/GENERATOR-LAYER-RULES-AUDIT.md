# Generator Layer Rules Audit

Reference for layer stacking rules and traits that need special handling.

## Z-Index Summary (bottom → top)

| z | Layer | Notes |
|---|-------|-------|
| 0 | Background | |
| 0.9 | ClothesCompositeUnderBase | Parts of composite suits that go behind Base (e.g. Proof of Prayer hood back) |
| 1 | Base | Wojak body |
| 2 | Clothes | Regular clothes (Sonic suit, Tee, etc.) |
| 2.1 | ClothesComposite0 | Composite suit layer0 (over base) — **under MouthBase and MouthItem** |
| 2.2 | ClothesComposite1 | Composite suit layer1 |
| 3 | ClothesAddon | G1 Chia Farmer addon |
| 4 | FacialHair | |
| 5 | MouthBase | Pizza, Numb, Smile, etc. — **always on top of composite suits** |
| 5.1 | BubbleGumRekt | |
| 6 | MouthItem | Pipe, Cig, Joint, Cohiba — **always on top of composite suits** |
| ... | Mask, Eyes, Head | |

## Sonic Suit vs Composite Suits

- **Sonic suit:** Regular Clothes (z 2). Has `fillFile` + `outlineFile`, not composite. Renders under Pizza Mouth and Pipe correctly.
- **Composite suits** (Gopher, Pickle, Goose, Drac, Bepe, Pepe, Proof of Prayer): Use `composite: true` with `layer0`/`layer1` or `layer0File`/`layer1File`. Now draw at z 2.1/2.2 so they render **under** MouthBase and MouthItem.

## Traits with Special Rules

| Trait | Rule |
|-------|------|
| Sonic suit | Regular Clothes (z 2) — no special handling |
| Gopher, Pickle, Goose, Drac, Bepe, Pepe suit | Composite — layer0/layer1 at z 2.1/2.2 (under mouth) |
| Proof of Prayer | Composite — layer0 underBase at 0.9, layer1 at 2.1 (under mouth) |
| Ninja Turtle Fit | Split: fill3/outline2 under base (0.9), fill1/fill2/outline1 over base (2) |
| Astronaut | Virtual layer, skips normal Clothes |
| Chia Farmer | Draws under layer (Tee/Tank) + outfit with fill above |

## Potential Future Adjustments

- **Trait card thumbnails:** Pipe (MouthItem) not shown in composite suit thumbnails — only Base + MouthBase. Consider adding Pipe for consistency if desired.
- **Other composite-like traits:** Audit any new composite traits to ensure underBase is set correctly.
- **Mouth items over specific heads:** MOUTH_OVER_CENTURION list — verify all mouth traits that should appear over Centurion are included.
