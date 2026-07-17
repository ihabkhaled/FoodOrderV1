# Skill: document an exception

## Required reading

[../rules/19-exceptions-policy.md](../rules/19-exceptions-policy.md),
[../docs/exceptions/README.md](../docs/exceptions/README.md) (process + template),
[../docs/migration/unresolved-exceptions.md](../docs/migration/unresolved-exceptions.md)
(EXC-1..EXC-5 as worked examples).

## Preconditions

- You tried the compliant design first and can explain concretely why it fails here
  (cost, risk to working tested code, missing environment — the EXC-1..5 reasons are the
  calibration bar).
- The deviation is bounded: you can name the exact files/paths it covers.
- Exhausted alternatives include: moving the code down a layer, extracting a hook/helper,
  adding a facade, splitting the file.

## Steps

1. Take the next free EXC number (EXC-1..5 are taken by the migration set).
2. Create `docs/exceptions/EXC-<n>-<slug>.md` using the template in
   `docs/exceptions/README.md`: **Rule** violated / **Reason** / **Mitigation** /
   **Owner** / **Removal condition** (concrete and testable).
3. Reference the exception ID in a comment at the code site it covers, and from any
   related rule/context doc.
4. If the exception needs a mechanical carve-out (an `eslint.config.js` block), the config
   comment must cite the EXC ID.
5. Run `npm run knowledge:build:incremental`; get the exception reviewed as part of the PR
   (it is a governance change, not a formality).

## Forbidden shortcuts

- Writing the exception after sneaking the deviation in (`eslint-disable` first, paperwork
  later).
- Vague removal conditions ("when we have time") — name the enabling event
  (cf. EXC-1: "when per-feature characterization tests exist").
- Widening an existing exception's scope instead of writing a new one.
- Using an exception where the honest answer is "move the code" — when a rule fails, the
  code is in the wrong layer.

## Required tests

The mitigation must be verifiable: if it claims "one public surface" or "one-way deps",
lint/madge prove it; cite the proving command in the document.

## Validation

```bash
npm run knowledge:build:incremental && npm run knowledge:validate
npm run lint
```

## Definition of done

Exception file with all five fields, linked from the code site, reviewed, and the deviation
scope exactly matches what the document says — nothing more.
