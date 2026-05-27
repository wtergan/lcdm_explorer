# `lcdm_explorer`

Browser-based sister project to
[`lcdm_sim`](https://github.com/wtergan/lcdm_sim): an interactive educational
explorer for Lambda Cold Dark Matter structure formation.

## Status

Explore implementation is underway from an approved product direction and a
validated compact export relationship to the existing Python simulation.

The proposed v1 product has two connected modes:

- **Explore**: cinematic playback of compact, validated reference scenarios
  exported from `lcdm_sim`.
- **Experiment**: a bounded live browser-side particle-mesh experience,
  beginning at small validated resolutions.

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

The interactive WebGL2 density-volume viewer and playback controls are the next
Explore implementation slice.

## Source Relationship

[`lcdm_sim`](https://github.com/wtergan/lcdm_sim) remains the reference PM
engine and future dataset-export
authority. This repo will own the interactive web experience and any
browser-side live solver after it is compared against Python reference outputs.
