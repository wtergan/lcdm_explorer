# `lcdm_explorer` Agent Instructions

Project-specific guidance for the interactive LCDM browser explorer.

## Current Phase

- This repo is in planning/scaffolding state; no application stack is installed
  yet.
- Begin implementation only from an explicit user request and a new executable
  feature plan under `.vault/plans/`.
- When a local `.vault/` directory is available, treat `.vault/PLAN.md` as the
  current project roadmap and `.vault/research/` as grounding evidence.

## Project Goal

- Build an educational desktop-first browser experience for exploring cosmic
  structure formation.
- Preserve two product modes: a validated cinematic `Explore` mode and a
  bounded live `Experiment` mode.
- Communicate the difference between educational model behavior and precision
  cosmological prediction clearly.

## Source Boundary

- `~/Code/lcdm_sim` is the reference particle-mesh engine and eventual
  web-dataset export authority.
- Do not duplicate or silently diverge from its simulation assumptions without
  an explicit decision record and comparison plan.
- Compact exported visualization assets belong in this app only after the
  export contract is implemented and validated upstream.

## Intended Implementation Direction

- Planned app stack: React, TypeScript, and Vite.
- Planned rendering: Three.js density-volume and particle rendering with a
  non-WebGPU-dependent viewer path.
- Planned live simulation: off-main-thread worker flow, starting with validated
  `16^3` and `32^3` runs.
- Keep WebGPU acceleration, `64^3` live runs, cosmological parameter controls,
  desktop packaging, accounts, and backend services out of v1 unless a later
  plan changes scope with evidence.

## Design Direction

- When local operational memory is available, read `.vault/.impeccable.md` and
  `.vault/visuals/concepts/` before user-facing UI work.
- Use the approved density-gradient concept: violet/indigo voids, teal/green
  filaments, and bright yellow high-density knots.
- Keep chrome restrained and science-exhibit-like rather than applying the
  data palette as decorative marketing styling.

## Workflow And Validation

- Use repo-local `.vault/` as operational engineering memory.
- Create a feature plan before implementation, design-system extraction,
  dataset export integration, or live-solver work.
- Use behavior-first tests once code exists.
- Validate rendered UI through browser screenshots against the approved
  concepts, including accessibility, reduced motion, loading/error states, and
  small-screen viewer behavior.
- Record durable decisions, reusable solutions, and recurring encounters in
  their corresponding `.vault/` directories.
