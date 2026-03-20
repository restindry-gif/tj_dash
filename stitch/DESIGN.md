# Design System Strategy: The Sovereign Dossier

## 1. Overview & Creative North Star
**Creative North Star: The Silent Authority**
In the world of private investigation, trust isn't earned through loud declarations; it’s established through precision, discretion, and the weight of evidence. This design system moves away from the "generic corporate dashboard" to embrace an **Editorial Intelligence** aesthetic. We are not building a simple data tracker; we are crafting a digital dossier that feels like a high-end, secure leather portfolio.

By utilizing intentional asymmetry, expansive negative space, and a sophisticated layering of deep tones, we create an environment that feels impenetrable yet effortless. We break the grid by allowing key "Evidence" (data points) to breathe, using the contrast between the authoritative **Manrope** display faces and the functional **Inter** body text to guide the investigator’s eye through high-stakes information.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the psychology of deep-sea blues and mineral greys, punctuated by "Gilded Intelligence"—a gold accent reserved strictly for high-priority breakthroughs.

### The "No-Line" Rule
To achieve a premium, custom feel, **directors and designers are prohibited from using 1px solid borders for sectioning.** Conventional borders create visual clutter that distracts from sensitive data. Instead, boundaries must be defined solely through:
*   **Background Shifts:** Use `surface-container-low` against a `surface` background.
*   **Tonal Transitions:** Defining an area by its depth rather than its perimeter.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of classified documents.
*   **Layer 0 (Base):** `surface` (#f4faff) for the widest application background.
*   **Layer 1 (The Desk):** `surface-container-low` (#e7f6ff) for large sidebar or navigation regions.
*   **Layer 2 (The File):** `surface-container-lowest` (#ffffff) for primary content cards, creating a crisp, "elevated paper" feel.
*   **Layer 3 (The Evidence):** `surface-container-high` (#d9ebf5) for nested details or search filters within a file.

### The "Glass & Gradient" Rule
Floating elements (modals, dropdowns, or hovering action bars) must utilize **Glassmorphism**. Apply a semi-transparent `surface-container-lowest` with a `backdrop-blur` of 12px. This prevents the UI from feeling "pasted on" and maintains the sense of a cohesive, secure environment. 

For high-priority CTAs or summary headers, use a subtle linear gradient from `primary` (#000666) to `primary-container` (#1a237e) at a 135-degree angle to add a "signature" depth that flat hex codes cannot achieve.

---

## 3. Typography
The typography system balances the "Human" (Editorial) with the "Machine" (Data).

*   **Display & Headlines (Manrope):** These are your "Executive Summary" fonts. Use `display-md` and `headline-sm` for case titles and high-level metrics. The wider tracking and geometric forms of Manrope convey a modern, unshakable authority.
*   **Title & Body (Inter):** The workhorse for the investigation. `title-sm` is reserved for card headers, while `body-md` handles the bulk of case notes. Inter’s high x-height ensures legibility when reviewing dense surveillance logs or financial records.
*   **Labels (Inter):** Use `label-md` in all-caps with +5% letter spacing for metadata (e.g., TIMESTAMP, CASE STATUS). This mimics the feel of a stamped document.

---

## 4. Elevation & Depth
In this system, depth is a function of light and material, not artificial lines.

*   **The Layering Principle:** Depth is achieved by stacking `surface-container` tiers. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft "lift" without the need for heavy shadows.
*   **Ambient Shadows:** If an element must float (e.g., a critical notification), use an ambient shadow. 
    *   *Spec:* `0px 8px 24px rgba(13, 30, 37, 0.06)`. The shadow color is a tinted version of `on-surface` (#0d1e25), never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a container edge, use a "Ghost Border." Apply `outline-variant` (#c6c5d4) at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Interface Elements

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `on-primary` text, `md` (0.375rem) roundedness. 
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Tertiary/Ghost:** `on-tertiary-fixed-variant` text. High-contrast gold highlights for "Resolve Case" or "Export Evidence" actions.

### Cards & Case Files
**Strict Rule:** No divider lines. Separate content using the Spacing Scale (e.g., `spacing-6` between sections) or a subtle background shift to `surface-variant`. Use `xl` (0.75rem) roundedness for outer case cards and `md` (0.375rem) for inner data chips.

### Input Fields
*   **Default State:** `surface-container-lowest` fill with a "Ghost Border."
*   **Focus State:** The "Ghost Border" increases to 100% opacity of `surface-tint` (#4c56af), and the background remains white.
*   **Error State:** Use `error` (#ba1a1a) text and a soft `error-container` background glow.

### Specialized Investigation Components
*   **Intelligence Chips:** Use `tertiary-fixed-dim` (#e9c176) for "High Priority" or "Red Flag" indicators. They should feel like gold-leaf markers on a physical file.
*   **Timeline Trackers:** Use a vertical "Ghost Line" (2px width, 10% opacity) to connect events, with `primary` nodes for milestones.
*   **Secure Status Indicators:** Use a pulsing `surface-tint` dot for "Active Surveillance" to provide a sense of "live" intelligence.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. A sidebar that doesn't reach the bottom of the screen or a header that overlaps a content card adds a custom, editorial feel.
*   **Do** leverage the `spacing-16` and `spacing-20` values to create "breathing room" around sensitive data points.
*   **Do** use `on-surface-variant` for secondary labels to create a clear visual hierarchy against primary `on-surface` data.

### Don't:
*   **Don’t** use pure black (#000000) for text. It’s too harsh. Use `on-surface` (#0d1e25) for high-contrast legibility.
*   **Don’t** use standard "Material Design" shadows. They are too generic for an agency of this caliber. Stick to Tonal Layering.
*   **Don’t** use bright, saturated colors for status. All colors should feel "weighted" and professional (e.g., use the provided `error` and `tertiary` tones).
*   **Don’t** use 1px dividers to separate list items. Use `spacing-4` padding and a 10% opacity hover state change instead. 

---
**Director's Closing Note:** 
Remember, we are designing for the *observer*. Every pixel should feel deliberate, every transition should be smooth, and the interface should never feel like it's trying too hard. Keep it quiet, keep it secure, keep it sovereign.