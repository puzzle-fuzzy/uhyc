# Product

## Register

product

## Users

AI-savvy content creators, designers, and marketers who need to generate images, video, and music quickly using Alibaba Cloud Bailian models. They understand model parameters enough to want control (resolution, aspect ratio, prompt crafting, reference assets) but expect the tool to handle polling, file management, and task orchestration. Their context: mid-workflow, often iterating on creative output, switching between generation and review.

## Product Purpose

uhyc is a generative AI media creation studio. Users select a model category (video, image, music), pick a specific model, configure parameters through a form tailored to that model's capabilities, upload reference assets when needed, and submit generation tasks. The app tracks task status, syncs results from Bailian, and surfaces completed media for download or iteration. Success means the user spends more time reviewing output than configuring input.

## Brand Personality

**Bold, playful, confident.** The interface speaks with conviction — strong borders, hard shadows, no ambiguity. The pastel accent palette (pink, purple, cyan) and dot-grid background add warmth and energy without becoming frivolous. It's a creative tool that takes its craft seriously but doesn't take itself too seriously.

## Anti-references

- **No dark-mode tech / terminal aesthetic.** No pure-black backgrounds, neon accents, monospace defaults, or "hacker tool" styling. The tool lives in the light, on a warm off-white substrate.
- **No generic SaaS blue.** No blue-heavy palette, no soft-shadow white cards stacked in identical grids, no corporate-generic layouts.
- **No over-minimalism.** No Apple-like thin borders, pale gray text, or vast empty whitespace. The neo-brutalist language of 2px borders, hard offset shadows, and confident typography is intentional and should stay.

## Design Principles

1. **Bold clarity.** Every element earns its place with deliberate visual weight. Strong borders, confident typography, unambiguous hierarchy. When a user looks at the interface, they immediately know what's interactive, what's status, and what's content.

2. **Creator-first workflow.** The generation panel and task history share the screen — no page-flipping between creating and monitoring. Controls stay accessible; results stay visible. The loop of create → monitor → review → iterate should feel like one continuous motion.

3. **Playful precision.** Pastel accents and the dot-grid background bring warmth to a precision tool. The personality lives in the accents, not in the structure — the layout is rigorous, the color is generous.

4. **Direct feedback.** Every interaction produces an immediate, visible response. Buttons translate on hover, toggles snap, range sliders track in real time. No invisible states, no silent failures, no mystery-meat navigation.

5. **Show the model, not the abstraction.** Where possible, replace abstract inputs with visual controls — a resolution picker over a dropdown, a toggle over a checkbox, a prompt editor with inline chips over raw text. The interface should teach the user about the model's capabilities through its controls.

## Accessibility & Inclusion

Target: WCAG 2.1 AA. Body text contrast ≥ 4.5:1 against backgrounds, large text ≥ 3:1. All interactive elements must be keyboard-navigable with visible focus indicators. Respect `prefers-reduced-motion` — animations should degrade to instant transitions or crossfades. The interface is currently Chinese-language; labels and error messages should remain in Chinese.
