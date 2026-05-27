# `lcdm_explorer`

Planning scaffold for a browser-based sister project to
[`lcdm_sim`](https://github.com/wtergan/lcdm_sim): an interactive educational
explorer for Lambda Cold Dark Matter structure formation.

## Status

This repository is intentionally pre-implementation. The first implementation
will begin from an approved product direction and a validated relationship to
the existing Python simulation.

The proposed v1 product has two connected modes:

- **Explore**: cinematic playback of compact, validated reference scenarios
  exported from `lcdm_sim`.
- **Experiment**: a bounded live browser-side particle-mesh experience,
  beginning at small validated resolutions.

The interface should help a curious visitor experience cosmic structure growth
and then understand it. It is not intended to make precision cosmological
predictions.

## Source Relationship

[`lcdm_sim`](https://github.com/wtergan/lcdm_sim) remains the reference PM
engine and future dataset-export
authority. This repo will own the interactive web experience and any
browser-side live solver after it is compared against Python reference outputs.
