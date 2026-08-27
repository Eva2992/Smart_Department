## Color & Theme System — Department Digitalization Platform

### Core Palette

| Role           | Color          | Hex       | Usage                                                                      |
| -------------- | -------------- | --------- | -------------------------------------------------------------------------- |
| Primary        | Crimson Red    | `#DC143C` | Primary buttons, active nav/tab state, links, Admin accents, progress bars |
| Secondary      | Warm Orange    | `#DA532C` | CR role tag, icons, CT session badges, secondary highlights                |
| Success        | Emerald Green  | `#16A34A` | Verified registration, approved promotion, completed/active status         |
| Error          | Rose Red       | `#E11D48` | Conflict errors, cancelled classes, validation errors, locked accounts     |
| Gold / Amber   | Amber          | `#F59E0B` | Holiday markers, rescheduled labels, pending-review flags                  |
| Background     | Warm off-white | `#FFFBFA` | App canvas / page background                                               |
| Surface        | Pure white     | `#FFFFFF` | Cards and panels — always paired with soft shadow, never a hard border     |
| Text (primary) | Charcoal       | `#1F2937` | Headings, body copy, data values                                           |
| Text (muted)   | Slate gray     | `#6B7280` | Captions, timestamps, secondary labels                                     |

### Status & State Colors (mapped to your routine/CT/holiday logic)

- **Scheduled** — neutral gray `#F3F4F6` bg / `#374151` text
- **Cancelled** — `#E11D48` (Error)
- **Rescheduled** — `#F59E0B` (Amber)
- **CT Session** — `#DA532C` (Secondary)
- **Holiday — No Class** — `#F59E0B` (Amber)
- **Approved / Verified** — `#16A34A` (Success)
- **Room / Time Conflict** — `#E11D48` (Error)

### Role Badges

- **Student** — Neutral gray `#6B7280`
- **Class Representative (CR)** — Warm Orange `#DA532C`
- **Teacher** — Charcoal `#1F2937`
- **Admin** — Crimson Red `#DC143C`

### Typography

- **Headings (English, default UI):** Poppins — bold/semibold, used for page titles, dashboard headers, stat numbers
- **Body / UI text:** Inter — form labels, table data, buttons
- **Optional (future Bangla support):** Hind Siliguri — kept in reserve since your SRS (C-10) specifies English-only for the initial release

### Surface & Elevation Tokens

- Card radius: **16–20px**
- Shadow: `0 4px 12px rgba(0,0,0,0.06)`
- Spacing: generous, 16–32px rhythm

### CSS Variables (copy-paste ready)

```css
:root {
  --color-primary: #dc143c;
  --color-primary-dark: #b01030;
  --color-secondary: #da532c;
  --color-success: #16a34a;
  --color-error: #e11d48;
  --color-gold: #f59e0b;
  --color-bg: #fffbfa;
  --color-surface: #ffffff;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;

  --radius-lg: 20px;
  --radius-md: 16px;
  --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.06);

  --font-heading: "Poppins", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-bengali: "Hind Siliguri", sans-serif; /* optional, future use */
}
```
