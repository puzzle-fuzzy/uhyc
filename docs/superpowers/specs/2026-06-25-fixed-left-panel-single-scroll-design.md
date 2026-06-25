# Fixed Left Panel + Unified Scroll — Design Spec

**Date:** 2026-06-25
**Status:** approved

## Goal

Restructure the generate studio layout so that:

1. The **left panel** (GeneratorPanel) is `position: fixed` — stays in place on screen
2. The **right side** (TaskHistory) is the sole scrollable region, using Radix ScrollArea
3. No independent scrollbars on the right panel; a single, unified scroll surface for the right column
4. The centered-grid look (`max-width: 1400px`) is preserved

## Current State (baseline)

| Element | Class | Behavior |
|---------|-------|----------|
| Body / page | — | scrolls naturally if content overflows |
| Left panel outer | `.gen-layout__left` | `position: sticky; top: 24px` |
| Left panel card | `.gen-panel` | `max-height: calc(100vh - 120px)`; flex column |
| Left form body | `.gen-panel__body` | `overflow-y: auto` — internal scroll |
| Right panel | `.gen-history` | `height: calc(100vh - 120px)` — fixed to viewport |
| Right scroll | `.gen-scroll` (Radix ScrollArea) | scrolls the task list independently |

Layout: 2-column CSS grid, `minmax(420px, 560px) 1fr`, centered with `max-width: 1400px; margin: 0 auto`.

## Target State

| Element | Class | Behavior |
|---------|-------|----------|
| Body / page | `html, body` | `overflow: hidden` — no native scrolling |
| App root | `.gen-app` | `height: 100vh` (was `min-height: 100vh`) |
| Left column cell | `.gen-layout__left` | Grid placeholder only (empty, width driven by grid) |
| Left panel card | `.gen-panel` | `position: fixed`; anchored to match grid left-column position; internal scroll on form body retained |
| Right column | `.gen-layout__right` | Fills remaining viewport height; hosts the single ScrollArea |
| Scroll container | `.gen-scroll` (Radix ScrollArea) | Wraps the entire right column; height = `100vh - topbar - padding` |
| Task history | `.gen-history` | `height: auto` — flows naturally inside ScrollArea |

## Implementation Plan

### 1. Body & root container lock

```css
html, body {
  overflow: hidden;   /* was: no overflow rule */
}

.gen-app {
  height: 100vh;       /* was: min-height: 100vh */
}
```

### 2. Grid layout — left cell becomes placeholder

`.gen-layout__left` stays in the grid to preserve column sizing, but loses its sticky positioning:

```css
.gen-layout__left {
  /* position: sticky, top, align-self, max-height — REMOVED */
}
```

### 3. Left panel becomes fixed

`.gen-panel` is lifted out of document flow with `position: fixed`. It needs:

- **`top`**: topbar height + 24px gap. Topbar is ~68px (16px padding × 2 + content). Use a CSS variable or calc: `top: calc(68px + 24px)` ≈ `92px`. Safer: reference a `--topbar-h` variable.
- **`left`**: aligned to the centered grid's left edge. When viewport > 1400px the grid is centered with auto margins, so left edge = `(100vw - 1400px) / 2`. When viewport ≤ 1400px, left edge = `24px` (the grid's padding). Expressed as: `left: max(24px, (100vw - 1400px) / 2)`.
- **`width`**: match the left grid column width (`minmax(420px, 560px)`). Expressed as: `width: clamp(420px, calc(100vw - 48px - 24px - 420px), 560px)`. (At wide viewports the grid left column maxes out at 560px; at narrow viewports it shrinks to 420px minimum before the responsive breakpoint kicks in.)
- **`max-height`**: `calc(100vh - 92px - 24px)` ≈ `calc(100vh - 116px)` — so panel never exceeds viewport.

Internal scrolling on `.gen-panel__body` is unchanged.

### 4. Right side — single ScrollArea

`.gen-layout__right` gets a ScrollArea that fills the viewport:

```css
.gen-layout__right {
  height: calc(100vh - 68px - 48px);  /* viewport - topbar - layout padding */
  overflow: hidden;                    /* contain the ScrollArea */
}
```

The ScrollArea already lives inside `.gen-history` in the current code. The restructuring is minimal — mostly CSS changes:

```tsx
// TaskHistory.tsx — structure stays nearly the same
// Only change: .gen-history gets height:100% instead of fixed calc()
// .gen-scroll fills the flex container naturally
<div className="gen-history">
  <h2 className="gen-history__title">生成记录</h2>
  <ScrollArea.Root className="gen-scroll">
    <ScrollArea.Viewport className="gen-scroll__viewport">
      <div className="gen-history__list">
        {/* task cards */}
      </div>
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar className="gen-scroll__bar">
      <ScrollArea.Thumb className="gen-scroll__thumb" />
    </ScrollArea.Scrollbar>
  </ScrollArea.Root>
</div>
```

`.gen-history` changes:
```css
.gen-history {
  /* height: calc(100vh - 120px) — REMOVED */
  display: flex;
  flex-direction: column;
  height: 100%;        /* fill .gen-layout__right */
}
```

`.gen-scroll` — existing rules (`flex: 1; min-height: 0; height: 0`) remain; they ensure ScrollArea fills the remaining space inside `.gen-history`.

### 5. Responsive reset

At `max-width: 960px`, revert to the current mobile behavior:

```css
@media (max-width: 960px) {
  html, body {
    overflow: auto;          /* restore native scrolling */
  }
  .gen-app {
    height: auto;            /* restore */
  }
  .gen-layout {
    grid-template-columns: 1fr;
  }
  .gen-panel {
    position: static;        /* back into flow */
    max-height: none;
    width: auto;
  }
  .gen-layout__right {
    height: auto;
    overflow: visible;
  }
  .gen-history {
    height: auto;
  }
  .gen-scroll {
    height: auto;
    max-height: 70vh;        /* existing mobile constraint */
  }
}
```

### Files changed

| File | What |
|------|------|
| `apps/generate/src/App.css` | Body lock, grid placeholder, fixed panel styles, right-column scroll, responsive reset |
| `apps/generate/src/components/TaskHistory.tsx` | Move ScrollArea to wrap entire right column (currently wraps only the list) |

No changes to `GeneratorPanel.tsx`, `App.tsx`, or any other component.

## Edge cases

- **Very tall form**: handled by `.gen-panel__body` internal `overflow-y: auto` — unchanged.
- **Narrow viewport (<960px)**: responsive reset switches back to static single-column with body scroll.
- **Few tasks**: no issue — ScrollArea just has minimal content.
- **Many tasks**: ScrollArea handles all scrolling; left panel stays fixed.
- **Image overlay (fullscreen preview)**: already uses `position: fixed` on `.gen-overlay` — no conflict.

## Non-goals

- Changing the visual design of either panel
- Modifying component structure beyond what's needed for the scroll/layout change
- Touching the topbar or auth behavior
