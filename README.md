# `lcdm_explorer`

Browser-based sister project to
[`lcdm_sim`](https://github.com/wtergan/lcdm_sim): an interactive educational
explorer for Lambda Cold Dark Matter structure formation.

## Status

Explore is implemented as a validated interactive reference-playback
experience. Experiment remains an explicitly gated future phase.

The proposed v1 product has two connected modes:

- **Explore**: cinematic playback of compact, validated reference scenarios
  exported from `lcdm_sim`.
- **Experiment**: a preview of a later bounded browser-side particle-mesh
  experience, beginning only after small resolutions are compared against
  Python fixtures.

The interface should help a curious visitor experience cosmic structure growth
and then understand it. It is not intended to make precision cosmological
predictions.

## Current Implementation

- React, TypeScript and Vite application foundation with strict manifest
  validation for compact reference datasets.
- Initial `gallery_128` Explore dataset exported from a validated upstream run
  as five compact `uint8` density volumes plus provenance manifest.
- Quiet exhibit shell that clearly labels exported reference playback and the
  educational-model boundary.
- Direct Three.js/WebGL2 density-volume playback with orbit, keyboard
  navigation, timeline controls, fallback behavior and reduced-motion handling.
- Optional field guide and manifest-backed density-contrast diagnostics.
- Honest Experiment preview documenting the future Worker and fixture gate
  without exposing unvalidated live computation.

## Local Validation

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

The bundled reference fixture contains five compact validated `128^3` density
frames: `10,485,760` frame bytes plus a `2,710` byte manifest.

## Source Relationship

[`lcdm_sim`](https://github.com/wtergan/lcdm_sim) remains the reference PM
engine and web-dataset export authority. This repo consumes its validated
compact output and will own any browser-side live solver only after comparison
against Python reference fixtures.
