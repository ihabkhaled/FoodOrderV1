# 26 — Mutating actions and busy state

## Rule

Every control that writes something — add, save, delete, share, invite, revoke,
place an order — MUST:

1. **Become unpressable while its request is in flight.** Use `BusyButton` from
   `@/shared/ui`, which disables itself, swaps in a spinner, and sets
   `aria-busy`.
2. **Take its busy flag from the view model that owns the request.** The
   component must not hold its own timer or guess when the work finished.
3. **End in a toast**: `showToast(message, 'success')` on success,
   `showToast(error instanceof Error ? error.message : t('tryAgain'), 'error')`
   on failure. A write that reports nothing is indistinguishable from one that
   silently failed.
4. **Re-enable in a `finally` block**, so a rejected request does not leave a
   permanently dead button.

## Motivation

A duplicate press produces a duplicate write. On a slow connection an unchanged
button looks broken enough to invite that second press, which is exactly when
the first request is still running — the worst possible moment. Disabling for
the duration removes the whole class of double-submit bugs without a debounce
or a guard flag in the gateway.

`aria-busy` matters for the same reason the spinner does: a screen reader user
is told what a sighted user can see, rather than being left with a button that
appears idle while something is happening.

## Shape

```tsx
const [saving, setSaving] = useState(false);

const save = useCallback(async () => {
  setSaving(true);
  try {
    await service.save(input);
    showToast(t('saved'), 'success');
  } catch (error) {
    showToast(error instanceof Error ? error.message : t('tryAgain'), 'error');
  } finally {
    setSaving(false);
  }
}, [input, showToast, t]);

<BusyButton busy={saving} busyLabel={t('loading')} onClick={() => void save()}>
  {t('save')}
</BusyButton>;
```

## Prohibited

- A mutating button with no busy state.
- A component that sets its own timeout to decide when work ended.
- Swallowing a failure without a toast.
- Leaving the button disabled after a rejection.

## Related

[12-error-handling.md](12-error-handling.md), [14-accessibility.md](14-accessibility.md),
[04-containers.md](04-containers.md).
