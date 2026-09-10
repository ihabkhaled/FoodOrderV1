# icons

Owned facade for `lucide-react`.

## Responsibility

Isolates the rest of the app from the icon library, per
[rules/08-package-ownership.md](../../../rules/08-package-ownership.md), and
curates which icons the app actually uses rather than exposing the whole
library.

## Public exports (`@/packages/icons`)

- `LucideIcon` (type) — the shared icon-component type.
- A curated set of 47 icon components, re-exported as-is: `AlertTriangle`,
  `ArrowLeft`, `Bell`, `CalendarClock`, `Check`, `CheckCheck`,
  `CheckCircle2`, `ChevronLeft`, `ChevronRight`, `ClipboardList`, `Copy`,
  `CopyPlus`, `Crown`, `Database`, `Download`, `Eye`, `EyeOff`, `Globe`,
  `GripVertical`, `History`, `Home`, `Info`, `KeyRound`, `Languages`,
  `LayoutDashboard`, `ListOrdered`, `LoaderCircle`, `Lock`, `LockOpen`,
  `LogOut`, `Mail`, `Minus`, `Monitor`, `Moon`, `Pencil`, `Plus`,
  `ReceiptText`, `RefreshCcw`, `RefreshCw`, `Repeat`, `Save`, `Search`,
  `Settings`, `Settings2`, `Share2`, `ShieldCheck`, `ShieldOff`,
  `ShoppingBasket`, `ShoppingCart`, `Sun`, `Trash2`, `UserMinus`,
  `UserPlus`, `UserRoundPlus`, `Users`, `Utensils`, `Wifi`, `WifiOff`, `X`.

## Structure

- `index.ts` — single-file re-export; no adapting logic.

## Dependencies

None.

## Consumers

Widely used across `src/app`, most `src/modules/*`, and `src/shared/ui` —
any screen or component that renders an icon.

## Testing

`tests/components/LinkRow.test.tsx` exercises a component that consumes this
package.
