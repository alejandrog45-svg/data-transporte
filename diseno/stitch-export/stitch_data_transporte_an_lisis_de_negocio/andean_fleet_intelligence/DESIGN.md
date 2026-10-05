---
name: Andean Fleet Intelligence
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff7f8b'
  on-tertiary-container: '#7d0023'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.875rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.45'
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: '1.25'
    letterSpacing: 0em
  label-badge:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies an executive telemetry platform tailored for high-frequency airport transfer logistics and fleet intelligence in Santiago de Chile. It projects operational omniscience, executive prestige, and modern technical precision. The emotional tone balances the composure of an air traffic control desk with the sleek polish of institutional fintech.

The aesthetic fuses **Refined Glassmorphism** with **Technical Minimalism**:
- **Atmosphere:** Deep obsidian and slate backdrops mimicking nocturnal aviation command consoles.
- **Illumination:** Precision accents of luminous cyan, electric teal, and operational emerald that direct focus without visual fatigue during prolonged nocturnal monitoring.
- **Tactility:** Multi-layered translucent panels with sub-pixel borders, fine ambient back-glows, and tight, structured typographic grids.

## Colors

The palette is engineered for prolonged operational awareness under low-light control rooms while delivering visual distinction between vehicle status, route telemetry, and monetary yields:

- **Canvas & Surface System:**
  - Base Background: `#0B0F17` (Deep Obsidian Void)
  - Card/Container Surface: `#111827` at 70% to 85% opacity with backdrop blur
  - Elevated Popovers & Modals: `#1E293B` with sub-pixel top lighting
  - Structural Ghost Borders: `rgba(255, 255, 255, 0.08)` to `rgba(6, 182, 212, 0.18)` on active components

- **Action & Identity (Teal / Cyan Spectrum):**
  - Primary Highlight: `#06B6D4` (Aviation Cyan)
  - Interactive Hover / Focus: `#22D3EE` (High-radiance Cyan)
  - Active Route/Fleet Status: `#0EA5E9` (Deep Cyan)
  - Secondary Core: `#14B8A6` (Precision Teal)

- **Semantic Financial & Telemetry Tokens:**
  - Positive Margins & Fleet Efficiency: `#10B981` (Emerald Core), `#34D399` (Emerald Glow)
  - Fuel Surcharges, Idle Costs & Delays: `#F43F5E` (Refined Coral/Rose), `#FB7185` (Coral Hover)
  - Attention / Flight Inbound Window: `#F59E0B` (Amber Warning)

- **Typography & Content Hierarchy:**
  - High-Contrast Data Readouts: `#F8FAFC`
  - Body Text & Secondary Telemetry: `#94A3B8`
  - Disabled / Grid Axis / Timestamps: `#64748B`

## Typography

The type hierarchy pairs **Plus Jakarta Sans** for structural UI commands and narrative dashboard levels with **JetBrains Mono** for numerical telemetry, flight arrivals, vehicle identifiers, and Chilean Peso (`CLP $`) metrics.

- **Financial & Data Formats:** Chilean currency figures must strictly use `JetBrains Mono` with explicit thousand-point delimiters (e.g., `CLP $1.425.800`) to guarantee tabular visual alignment across real-time ledger columns.
- **Flight & Fleet IDs:** Transfer codes (e.g., `SCL-VAN-402`, `FL-LA2411`) adopt `label-badge` with upper-case styling and letter spacing to maximize scan speed.

## Layout & Spacing

The system runs on a 12-column fluid grid configured for high-density information architecture across multi-monitor dispatch environments:

- **Breakpoints:**
  - **Desktop / Wallboard (1440px+):** 12 columns, `gutter-lg` (24px), outer margin `margin-lg` (32px). Persistent navigation rail with fluid dashboard matrix.
  - **Laptop / Operations Desk (1024px - 1439px):** 12 columns, `gutter` (20px), outer margin `margin-md` (24px).
  - **Field Tablet / Lead Dispatcher (768px - 1023px):** 6 columns, `gutter` (16px), outer margin `margin-md` (24px). Sidebar auto-collapses to icon rail.
  - **Mobile Driver / On-Site Supervisor (&lt;768px):** 4 columns, single-column reflow for charts, outer margin `margin` (16px).

- **Rhythm Rules:** Spacing inside telemetry cards enforces strict density: `space-sm` (8px) separates header titles from metric values; `space-md` (14px) buffers chart legends; `space-lg` (20px) governs internal card padding.

## Elevation & Depth

Visual hierarchy uses frosted optical depth and directional edge illumination rather than heavy dropshadows:

- **Surface Base (Level 0):** Flat background in `#0B0F17` textured with an ultra-subtle radial gradient tinted at `rgba(6, 182, 212, 0.03)` positioned top-center.
- **Glass Panel (Level 1 - Telemetry Cards):** Background `rgba(17, 24, 39, 0.72)` supported by `backdrop-filter: blur(16px)` and a directional border: `1px solid rgba(255, 255, 255, 0.07)` with a top highlight of `1px solid rgba(6, 182, 212, 0.20)`. Box shadow: `0 8px 32px -4px rgba(0, 0, 0, 0.55)`.
- **Raised Interactive (Level 2 - Hovered Rows, Dropdowns):** Background `rgba(30, 41, 59, 0.85)` with `backdrop-filter: blur(20px)`. Border `1px solid rgba(34, 211, 238, 0.35)`. Shadow `0 12px 36px -2px rgba(6, 182, 212, 0.12)`.
- **Command Overlays & Modals (Level 3):** Background `#111827` at 95% opacity with an exterior aura glow: `0 0 0 1px rgba(6, 182, 212, 0.3), 0 24px 64px -12px rgba(0, 0, 0, 0.85)`.

## Shapes

The interface embraces a refined curvilinear silhouette that softens technical density:
- **Base Components & Form Controls:** Standard radius `0.5rem` (`rounded-md`).
- **Telemetry & Fleet Cards:** `1rem` (`rounded-lg`) up to `1.5rem` (`rounded-xl`) to establish an executive, consumer-grade polish.
- **Micro-Badges & Status Beads:** Full pill rounding (`9999px`) to distinguish tags and operational indicators from structural content boxes.

## Components

### Buttons
- **Primary Operational:** High-radiance cyan gradient (`linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)`), text `#0B0F17` in bold `Plus Jakarta Sans`, inner top bevel `1px solid rgba(255,255,255,0.3)`. Hover elevates with a soft cyan bloom (`box-shadow: 0 0 20px rgba(6, 182, 212, 0.45)`).
- **Secondary Glass:** `rgba(30, 41, 59, 0.6)` with `1px solid rgba(255, 255, 255, 0.12)`, text `#F8FAFC`. Hover shifts border to `rgba(6, 182, 212, 0.4)` and text to `#22D3EE`.
- **Ghost/Tertiary:** Transparent fill, text `#94A3B8`, transitions to `#F8FAFC` with subtle slate backing.

### Micro-Badges & Telemetry Beads
- **Vehicle Status (En Ruta / Disponible / Mantenimiento):** Pill shapes featuring an embedded 6px pulsating dot.
  - Active: Background `rgba(6, 182, 212, 0.12)`, text `#22D3EE`, border `1px solid rgba(6, 182, 212, 0.35)`.
  - Positive Yield / On Time: Background `rgba(16, 185, 129, 0.12)`, text `#34D399`, border `1px solid rgba(16, 185, 129, 0.35)`.
  - Delay / High Expense: Background `rgba(244, 63, 94, 0.12)`, text `#FB7185`, border `1px solid rgba(244, 63, 94, 0.35)`.

### Cards & Telemetry Containers
- Enclosed with 16px to 24px inner padding, subtle frosted slate background (`#111827` @ 75%), sharp upper edge highlight.
- Header groups place metric titles in `#94A3B8` uppercase at 11px alongside dynamic trend chips (`+12.4% vs semana ant.`).

### Input Fields & Search Bars
- Dark recessed fill `#0B0F17` at 80% opacity, border `1px solid rgba(255, 255, 255, 0.1)`. Placeholder text `#64748B`.
- Focused state eliminates generic browser rings, engaging a luminous dual border: `1px solid #06B6D4` paired with `0 0 0 3px rgba(6, 182, 212, 0.15)`.

### Checkboxes & Segmented Controls
- Checkboxes: 18px rounded squares with dark slate background; checked state fills with `#06B6D4` and deep obsidian check icon.
- Fleet Filter Switcher: Segmented dark pill bar (`#0B0F17`) containing sliding translucent thumb with cyan border glow.

### Specialized Fleet Modules
- **Flight Arrival Telemetry Strip:** Horizontal feed rendering flight codes (`LA500`), origin (`MIA`), arrival countdown, assigned van ID, and transfer readiness status using tabular mono formatting.
- **CLP Financial Sparkline Card:** Micro financial card displaying net yields per route (e.g., *Aeropuerto SCL ↔ Las Condes / Providencia*), displaying total revenue in bold mono accompanied by high-contrast neon green performance gradients.