# ElektroBrudi Design Builder

This local Figma development plugin completes the approved three-page design in
the existing `ElektroBrudi — MVP UI` file. It uses no network access and does
not delete or replace existing generated content.

## Run once in Figma Desktop

1. Open [the ElektroBrudi Figma file](https://www.figma.com/design/ZsgHumU2OEGQrJgT5ebiJQ).
2. Choose **Plugins → Development → Import plugin from manifest…**.
3. Select this directory's `manifest.json`.
4. Run **Plugins → Development → ElektroBrudi Design Builder**.
5. Wait for the success toast, then inspect all three pages.

The plugin focuses the desktop Overview frame after a successful build. To
assess any other frame at a readable scale, select it and press **Shift+2**
(`Zoom to selection`); do not evaluate typography while the full 3100 × 3900
Key Screens board is fitted at 50%.

The builder requires SF Pro, which is available in Figma Desktop on macOS. It
expects exactly these existing pages:

- `01 · Foundations & Guidelines`
- `02 · Components & States`
- `03 · Key Screens`

If any generated root already exists, the plugin stops without changing it.
This is intentional: reruns must never silently overwrite reviewed design work.

## Verify and hand off

On `03 · Key Screens`, verify and export these six PNG previews:

- `Overview · Completed · Mixed verification`
- `Overview · Completed · Mixed verification · Mobile`
- `Offer detail · Pattern · Desktop`
- `Offer detail · Pattern · Mobile`
- `Settings · Pattern · Desktop`
- `Settings · Pattern · Mobile`

Also run the Import Flow prototype from `EMPTY` through `COMPLETED` and inspect
the `PARTIAL` and `FAILED` branches. Attach the six PNGs and the Figma link to
GitHub issue #18 before closing it.

## Local checks

```sh
node --test tools/figma-elektro-brudi/plugin.test.mjs
node --check tools/figma-elektro-brudi/code.js
```
