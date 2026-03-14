# Meus Pagamentos — Design System

## Direction: Caderneta

The interface feels like a well-kept pocket ledger. Warm paper tones, ink-dark text, a sense of handwritten order. The user is a Brazilian individual checking off recurring monthly bills — the experience should feel controlled and reassuring, not like a corporate dashboard.

**Signature:** The quinzena split (1ª/2ª Quinzena) is the structural heartbeat — expenses divided by pay period, with ruled-line section dividers and per-section subtotals.

## Color

- **Primary:** Amber (Tailwind `amber` via Nuxt UI)
- **Neutral:** Stone (Tailwind `stone` via Nuxt UI)
- **Semantic:** Success = olive-tinted green (paid), Warning = warm amber (pending)
- **Temperature:** Warm throughout — no cool grays or blues

### Custom surfaces (CSS variables in `main.css`)

```
--ui-bg:          oklch(97.5% 0.008 80)   /* warm parchment */
--ui-bg-muted:    oklch(95.5% 0.01 80)    /* slightly deeper parchment */
--ui-bg-elevated: oklch(99% 0.005 80)     /* card surface */
--ui-bg-accented: oklch(93% 0.012 80)     /* inset elements */
```

### Ink text hierarchy

```
--ui-text-highlighted: oklch(22% 0.02 60)  /* headings, emphasis */
--ui-text:             oklch(30% 0.02 60)  /* body text */
--ui-text-toned:       oklch(42% 0.015 60) /* secondary values */
--ui-text-muted:       oklch(52% 0.012 65) /* labels */
--ui-text-dimmed:      oklch(62% 0.01 70)  /* metadata, hints */
```

### Borders

```
--ui-border:          oklch(82% 0.01 75 / 0.6)  /* ruled lines */
--ui-border-muted:    oklch(87% 0.008 75 / 0.5) /* soft separation */
--ui-border-accented: oklch(72% 0.015 70 / 0.6) /* emphasis */
```

## Typography

- **Branding/headings:** `font-serif` (Georgia, system serif) — ledger personality
- **UI/body:** System sans-serif (Nuxt UI default)
- **Data:** `tabular-nums` for financial values and percentages
- **Tracking:** `tracking-tight` on serif headings for presence

## Depth Strategy

**Borders-only.** No shadows. Thin ruled lines like a notebook. Cards use `rounded-xl border border-muted bg-elevated` instead of UCard where custom styling is needed.

## Layout

- **Container:** `max-w-4xl` — uses available desktop space
- **Desktop (lg+):** Two-column grid `grid-cols-[280px_1fr]` — summary sidebar left, expense list right
- **Mobile:** Single column, stacked (summary above expenses)
- **Summary sidebar:** `lg:sticky lg:top-6` — stays visible while scrolling expenses on desktop

## Spacing

- Base: 4px (Tailwind default)
- Card padding: `p-5` (summary), `px-4 py-3` (expense items)
- Section gap: `space-y-6` between quinzena sections
- Item gap: `space-y-2` between expense rows
- Grid gap: `gap-6` between sidebar and main content

## Key Patterns

### Summary Panel
Single consolidated panel as sticky sidebar on desktop. Stacks vertically: hero total amount → progress thermometer → paid/pending breakdown (2-col grid separated by `border-t`). Uses `rounded-xl border border-muted bg-elevated p-5`.

### Expense Item (checklist row)
Flat row, not a card. `group flex items-center gap-3 px-4 py-3 rounded-lg border`. Status expressed through:
- Paid: `border-success/20 bg-success/4`, name gets `line-through text-muted`
- Pending: `border-muted hover:border-accented bg-elevated`
- Skipped: `border-muted opacity-50`
- Three-dot menu: `opacity-0 group-hover:opacity-100`
- Status badge only shown for non-pending (pending is default, unlabeled)

### Due Day Pill
`w-9 h-9 rounded-md` with "dia" label (9px uppercase) and day number (sm bold tabular-nums).

### Section Divider (Quinzena)
`text-xs font-semibold text-muted uppercase tracking-wider` label + `border-b border-muted` rule + subtotal in `text-xs font-medium text-dimmed tabular-nums`.

### Month Navigator
Serif heading (`font-serif text-xl font-semibold`), flanked by ghost chevron buttons. "Voltar para hoje" link below when not on current month.

### Login
Hand-styled panel (`rounded-xl border border-muted bg-elevated p-8`) instead of UCard. Serif branding matches app header.

## Configuration

```ts
// vite.config.ts
ui({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'stone',
    },
  },
})
```

```css
/* main.css — @theme block */
@theme {
  --font-serif: Georgia, "Times New Roman", serif;
}
```
