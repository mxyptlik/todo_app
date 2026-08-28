# Daylist design system

The product is a calm, editorial task workspace: warm paper (`#f9f7f2`) around a white work card, navy ink, a vivid blue primary action/focus colour, and green reserved for completed work. DM Sans supplies the display and interface scale. Spacing follows 4/8px increments; controls are at least 40px tall and task rows use 44px-or-larger touch targets.

## Tokens

- Page/surface: `--page`, `--surface`; primary/secondary text: `--ink`, `--muted`
- Structure/action: `--navy`, `--blue`; completion: `--green`; focus: `--focus`
- Radius: 12px controls, 20px workspace, pill progress
- Type: 13px metadata, 16px task body, 18px section heading, 32px page title

## Interaction and accessibility

The composer preserves text on validation/network failure. Filters are real buttons with `aria-pressed`; task completion is a labelled checkbox; deletion has an accessible label and native tooltip. Loading, empty, errors, disabled, focus-visible, pressed, and completed states are all represented. Short transitions are disabled for reduced-motion users. The mobile layout is designed from 320px up with no hover-only action.

Scheduling separates the date from the start time: one-tap Morning, Noon, Afternoon, and Evening choices remove the mobile time-spinner gesture, while an explicitly labelled half-hour selector remains available for a precise choice. The Agenda tab sorts scheduled items and marks active overlaps in text. The notification center distinguishes a server that lacks VAPID setup, an enabled device, a denied permission, and unsupported browsers; it never implies that a reminder was delivered when push is unavailable. Actual delivered reminders persist in the notification center, and a red numeric badge on Alerts denotes unread items until the user chooses **Mark all read**. Scheduled cards expose a labelled calendar-export action.
