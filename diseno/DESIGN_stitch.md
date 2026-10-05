---
name: Andean Flight Operations
colors:
  surface: '#0e1321'
  surface-dim: '#0e1321'
  surface-bright: '#343948'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2a'
  surface-container: '#1a1f2e'
  surface-container-high: '#252a39'
  surface-container-highest: '#303444'
  on-surface: '#dee2f6'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dee2f6'
  inverse-on-surface: '#2b303f'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0e1321'
  on-background: '#dee2f6'
  surface-variant: '#303444'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style
The design system establishes a high-performance, mission-critical operations dashboard engineered for dispatch controllers, logistics analysts, and fleet directors managing private airport transfers across Santiago (SCL) and the broader metropolitan corridor. 

The aesthetic is anchored in **Technical Minimalism with Ambient Glass Elements**, balancing dense operational data with instantaneous visual comprehension under 24/7 low-light dispatch floor conditions. The interface prioritizes clarity, structural hierarchy, and rapid anomaly detection, projecting precision, reliability, and modern executive polish.

## Colors
The system relies on a tiered navy depth hierarchy combined with high-contrast signal accents to minimize eye fatigue during prolonged analytical tasks.

### Surface Architecture
- **Base Canvas (`#0A0F1D`)**: Deep obsidian-navy foundation for application background and root layout canvas.
- **Surface Elevation 1 (`#10192D`)**: Card modules, lateral navigation panels, and structural data grids.
- **Surface Elevation 2 (`#16223D`)**: Interactive tables, modal overlays, hovered rows, and popovers.
- **Surface Elevation 3 (`#1E2E4F`)**: Selected states, active drawer panels, and elevated dropdowns.

### Borders & Dividers
- **Hairline Structural Border (`#1E293B`)**: Standard component boundaries, vertical grid dividers, and table row lines.
- **Interactive Border (`#334155`)**: Hovered containers, input strokes, and active tab indicators.

### Accents & Signal Matrix
- **Primary Electric (`#3B82F6` base, `#2563EB` active/deep)**: Primary interactions, KPI sparkline plots, and active operational filters.
- **Telemetry Cyan (`#06B6D4`)**: Live flight tracker statuses, vehicle telematics updates, and Santiago airport (SCL) corridor indicators.
- **Simulation Amber (`#F59E0B` text / `#FDE68A` soft background with 12% alpha)**: Route scenario projections, vehicle delay warnings, and simulation trial badges.
- **Critical Red (`#EF4444`)**: Unassigned high-priority VIP transfers, flight cancellations, and critical SLA breaches.
- **Success Emerald (`#10B981`)**: Completed transfers, on-schedule arrivals, and healthy fleet availability.

## Typography
The typographic hierarchy leverages **Plus Jakarta Sans** for dashboard titles, card headers, and analytical section heads, introducing crisp modern geometry without sacrificing seriousness. **Inter** handles all data presentation, UI labels, and dense statistical tables.

### Rules for Numerical Data
All tabular metrics, flight numbers (e.g., `LA-530`), vehicle license plates, times, and Santiago currency amounts (`CLP $`) must use monospace or tabular numerical alignment (`font-feature-settings: "tnum" 1, "cv05" 1`). Uppercase letter-spacing (+0.04em) is strictly enforced on `label-sm` for system status headers and table column captions.

## Layout & Spacing
The layout adheres to an operational 12-column responsive fluid grid designed for dense information distribution across panoramic multi-monitor command workstations as well as field laptops.

- **Breakpoints**: 
  - Mobile (`< 768px`): Single-column stacked layouts, collapsable telemetry drawer, hidden complex data grids in favor of operational cards. Margin: `1rem`, Gutter: `0.75rem`.
  - Tablet (`768px – 1199px`): 6-column reflow, collapsed icon sidebar. Margin: `1.5rem`, Gutter: `1rem`.
  - Desktop (`1200px+`): 12-column persistent asymmetric structure with fixed 260px primary navigation sidebar, dynamic master detail workspace, and persistent telemetry panel. Margin: `2rem`, Gutter: `1.5rem`.
- **Rhythm**: All micro-gaps and component paddings follow an 8-point system (scaled to 4px for tight form controls and tabular cell padding).

## Elevation & Depth
Depth is realized through dark-mode surface separation, subtle border luminescence, and localized atmospheric glow rather than standard heavy drop shadows.

- **Base Canvas (Level 0)**: Flat `#0A0F1D`.
- **Panel Surface (Level 1)**: `#10192D` with an omnipresent 1px hairline border in `#1E293B`.
- **Hover / Interactive Cards (Level 2)**: Background shifts to `#16223D` with a subtle directional top border highlight (`rgba(59, 130, 246, 0.25)`) and a diffused ambient blue drop shadow: `0 10px 25px -5px rgba(2, 6, 23, 0.6), 0 0 12px 0 rgba(37, 99, 235, 0.08)`.
- **Float Modals & Action Menus (Level 3)**: `#16223D` elevated with dual-layer shadows: `0 20px 35px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px #334155`.

## Shapes
A disciplined **Soft (`roundedness: 1`)** form factor establishes a precise, instrument-grade technical atmosphere. 

- **Containers & Data Modules**: 6px (`0.375rem`) to 8px (`0.5rem`) corner radiuses retain a structured, architectural layout.
- **Controls & Form Inputs**: 6px (`0.375rem`) corner radiuses for crisp precision.
- **Status Pills & Chips**: Strictly fully rounded (`9999px`) to visually contrast against the rigid rectilinear data grid and instantly signify dynamic operational state.

## Components

### Buttons
- **Primary Action**: Solid `#2563EB` background with sharp text contrast (`#FFFFFF`), 6px radius, hover shift to `#3B82F6` coupled with an internal top specular stroke (`inset 0 1px 0 rgba(255, 255, 255, 0.15)`).
- **Secondary / Utility**: Flat `#10192D` background, 1px `#334155` border, text `#94A3B8`. Hover introduces text `#F8FAFC` and border `#3B82F6`.
- **Destructive**: Low-alpha red tint (`rgba(239, 68, 68, 0.1)`), stroke `rgba(239, 68, 68, 0.3)`, text `#F87171`.

### Status Badges & Crisp Pills
- **Simulation Badges**: Full pill (`rounded-full`), `space-xs` vertical padding, `space-sm` horizontal padding. Rendered in 10% translucent amber fill (`rgba(245, 158, 11, 0.1)`), 1px solid border (`rgba(245, 158, 11, 0.3)`), and high-contrast text (`#FDE68A`).
- **Telemetry Live Badges**: Translucent cyan fill (`rgba(6, 182, 212, 0.1)`), 1px cyan border (`rgba(6, 182, 212, 0.35)`), cyan text (`#22D3EE`), accompanied by a 6px pulsing dot.

### Structured Data Tables
- **Header**: `#10192D` background, fixed 36px height, text in uppercase `label-sm` (`#64748B`), bottom border 1px solid `#1E293B`.
- **Row Styling**: Alternating or transparent base with a border-bottom of 1px solid `#16223D`. Hover initiates instantaneous row transition to `#16223D` with text sharpening from `#94A3B8` to `#FFFFFF`.
- **Metrics Columns**: Strict right-alignment using tabular numerals (`numeric-table`).

### Input Fields & Search Controls
- Flat `#0D1527` background, 1px border `#1E293B`, internal padding `space-sm` `space-md`. 
- Focus state activates an electric blue ring: `border-color: #3B82F6` with `box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2)`.

### Operational Metric Cards
- Surface `#10192D` with an outer border of `#1E293B`. Internal layout contains a 2-part structure: top row featuring contextual label (`label-sm`) and utility action icon; bottom row displaying high-contrast primary metric (`headline-lg`) flanked by trend badges and micro-sparklines.