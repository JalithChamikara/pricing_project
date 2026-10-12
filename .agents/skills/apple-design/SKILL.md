---
name: apple-design
description: Apple Human Interface Guidelines (HIG) and premium design system principles for web and mobile interfaces. Covers typography, glassmorphism, translucency, squircle radius hierarchy, tactile buttons, segmented controls, Apple Health/Stocks chart aesthetics, and mobile ergonomics.
---

# Apple Design Principles & Human Interface Guidelines (HIG)

This skill provides design tokens, layout patterns, and component recipes based on Apple's design philosophy adapted for modern web applications.

## 1. Aesthetic Foundations & Spatial System

### Color Palette (Light Mode First)
- **Canvas / Background**: `#fbfbfd` (Apple's signature ultra-clean off-white) or `#f5f5f7` (light system grouped background).
- **Cards / Surfaces**: Pure white `#ffffff` with subtle borders (`rgba(0,0,0,0.06)` or `border-neutral-200/70`) and soft ambient elevation.
- **Brand Accent**: Apple Vibrant Green / Mint (`#059669` / `#10b981` / `#047857`) for positive finance/growth actions, with delicate background tints (`emerald-500/10` or `#ecfdf5`).
- **Typography Inks**:
  - Primary Label: `#1d1d1f` or `#111827` (deep crisp black, high contrast).
  - Secondary Label: `#6e6e73` or `#64748b` (neutral gray, calm and legible).
  - Tertiary / Hint: `#86868b` or `#94a3b8`.
- **System Accents**:
  - Positive / Up: Emerald / Forest `#059669` (`bg-emerald-50 text-emerald-700`).
  - Warning / Competitor: Warm Amber `#d97706` (`bg-amber-50 text-amber-700`).
  - Negative / Down: Coral / Red `#dc2626` (`bg-rose-50 text-rose-700`).

### Translucency & Materials (Vibrancy)
- Apple navigation bars, floating headers, and modal backdrops use frosted glass:
  `backdrop-blur-xl bg-white/80 border-b border-black/[0.06]`
- Modal overlays: `backdrop-blur-md bg-black/30` or `bg-neutral-900/40`.

### Radii Hierarchy (Squircles)
- Small elements (pills, badges, small buttons): `rounded-full` or `rounded-xl` (12px).
- Interactive inputs, select boxes, main buttons: `rounded-2xl` (16px–18px).
- Cards, grouping containers: `rounded-[24px]` to `rounded-[32px]`.
- Modals, action sheets: `rounded-[28px]` or `rounded-[36px]`.

---

## 2. Component Design Specifications

### Tactile Buttons
- **Touch Target**: Minimum height `54px` to `58px` on mobile for thumb friendliness.
- **Micro-interactions**: `active:scale-[0.98] transition-all duration-200 ease-out`.
- **Primary Button**: Solid vibrant color with subtle top highlight and soft tinted drop shadow:
  `shadow-[0_4px_14px_0_rgba(5,150,105,0.35)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.45)]`.
- **Secondary / Glass Button**: Translucent white or subtle neutral with border:
  `bg-neutral-100 hover:bg-neutral-200/80 active:scale-[0.98] text-neutral-900 font-semibold`.

### Segmented Controls (Language Switcher & Tabs)
- Encapsulated pill container: `bg-neutral-200/60 p-1 rounded-full backdrop-blur-sm`.
- Active item: Pure white floating pill with crisp shadow: `bg-white text-neutral-900 shadow-sm rounded-full font-semibold`.
- Inactive items: `text-neutral-600 hover:text-neutral-900 font-medium`.

### Form Fields & Inputs
- Subtle inset or clean framed border with generous internal padding:
  `h-14 px-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 transition-all`.
- Labels positioned with clear visual weight: `text-sm font-semibold tracking-tight text-neutral-800`.

### Apple Health / Stocks Chart Style
- Minimalist Cartesian grids (single horizontal axis line or ultra-subtle dashed lines).
- Soft gradient fills underneath line curves.
- Rounded pill bar charts with soft corner radius `[8, 8, 0, 0]`.
- Tooltip styled like an iOS notification card: `rounded-2xl bg-white/95 backdrop-blur-md p-3.5 shadow-xl border border-neutral-100`.

### Modal & Bottom Sheet (iOS Ergonomics)
- Drag pill indicator at top: `w-10 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4`.
- Big rounded corners: `rounded-3xl` or `rounded-[32px]`.
- Smooth entrance animation (`animate-in fade-in zoom-in-95 duration-200`).
