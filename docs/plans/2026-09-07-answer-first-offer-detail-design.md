# Answer-First Offer Detail Design

## Scope

Redesign only the desktop and mobile Offer Detail references on `03 · Key Screens`. The user's adapted Overview, the import flow, Settings, Foundations, and Components are protected and must not be rebuilt, replaced, repositioned, or restyled.

The detail view must let a buyer answer five questions immediately:

1. Why is this offer a good choice?
2. What do I actually pay each month?
3. How does its complete cost compare with keeping the Golf?
4. What are the exact terms of the selected credit?
5. What does the vehicle look like, and how do I return to the original listing?

The selected financing scenario is the leading scenario. Alternative eligible scenarios remain visible as compact comparisons, but they do not replace or contradict the selected scenario's headline.

## Direction

Use an answer-first decision cockpit rather than a collection of equally weighted cards. Retain the approved light-only, restrained macOS-native visual language: sidebar on desktop, compact top navigation on mobile, SF Pro where renderable, soft neutral surfaces, blue actions, semantic status labels, minimal shadows, and 10–12 px radii.

The visual hierarchy is deliberately asymmetric. The decision, monthly payment, and Golf comparison carry the most visual weight. Scores, evidence, and correction tools explain the decision afterward.

## Information Architecture

### 1. Offer identity

The page begins with a compact navigation and identity row:

- Back to `Übersicht`
- `Hyundai IONIQ 5 · Techniq`
- `Verifiziert verfügbar`, rank, and `84 / 100`
- `36.490 €`, `22.900 km`, and `EZ 04/2023`
- Source and freshness remain subdued metadata

Rank and score provide orientation, not the main reason to buy.

### 2. Listing image and original offer

The opening section uses the imported listing's primary vehicle image as a prominent visual anchor. On desktop it occupies the left side of the hero at a restrained 16:10 ratio; on mobile it spans the content width directly below the identity row. The image uses `cover` behavior without stretching the vehicle.

The media treatment includes:

- a compact `1 von 12` gallery position when multiple images exist;
- the source domain, such as `Quelle: mobile.de`;
- a clearly visible `Originalangebot öffnen ↗` action;
- descriptive alternative text derived from make, model, and view when available;
- a neutral `Kein Fahrzeugbild verfügbar` fallback that never fabricates a listing photo.

The original-offer action opens the imported `offer.sourceUrl` in the default browser. It must show the destination domain and use an external-link affordance so navigation away from ElektroBrudi is predictable. The reference design may use a clearly labeled `Beispielfoto`; it must not imply that a generated or stock image came from the listing.

### 3. Immediate decision summary

A large `Warum dieses Angebot gut passt` panel opens the content. It contains three plain-language, evidence-backed reasons:

- lower effective monthly cost than the configured Golf reference;
- selected financing fits the configured installment budget;
- the most important equipment is verified, with one remaining uncertainty called out explicitly.

Alongside it, `Deine Zahlungen` shows a payment timeline instead of an isolated rate:

- `Heute`: down payment;
- `Monatlich`: regular installment, visually dominant;
- `Am Ende`: final or balloon payment;
- term and financing type.

The regular installment is labeled `Monatsrate`, never `Effektiv / Monat`. A short note says that the rate alone is not the full cost.

### 4. Transparent Golf comparison

The next panel compares equivalent effective costs:

- `Dieses Angebot`: effective monthly total;
- `Dein Golf`: effective monthly total;
- `Dein Vorteil`: difference per month and across the selected term.

The comparison explicitly states that down payment, installments, final payment, fees, expected running costs, and the model's residual-value treatment are included. A `Berechnung ansehen` disclosure shows the contributing categories without navigating away.

The Figma reference may use illustrative values for data absent from the current fixture, but every such value must be visibly labeled `Beispieldaten`. The design must not imply that synthetic interest, fee, balloon, residual-value, or running-cost values came from the imported offer.

### 5. Selected credit details

`Ausgewählte Finanzierung` is a full-width, always-visible section. It uses aligned label/value groups instead of badges:

- **Start:** provider, financing type, purchase price, down payment, net loan amount;
- **Monthly:** installment, term, nominal interest, effective annual interest;
- **End:** final payment and expected end date;
- **Total:** fees, total credit cost, total loan repayment, and total amount paid including down payment.

An eligibility banner explains why the scenario is valid. `Finanzierung ändern` is the primary contextual action. Alternative scenarios appear below as compact rows containing scenario name, installment, effective total, and eligibility; selecting one changes the entire summary consistently.

### 6. Why it scored well

The score becomes explanatory rather than decorative:

- `Finanzierung 59 / 70` with two short reasons and any penalty;
- `Ausstattung 25 / 30` with confirmed requirements and the unresolved item;
- a compact total of `84 / 100`.

This section follows the complete financial explanation, so the user first understands the decision and only then the scoring model.

### 7. Equipment, evidence, and correction

Group equipment by certainty:

- `Bestätigt`: verified required features;
- `Noch prüfen`: discovered, unknown, prepared-only, or subscription-required features.

Each row retains source/evidence access. Correction controls are attached to the specific fact they change. They no longer sit as generic page-level actions.

## Desktop Layout

The reference remains a 1100 × 760 pattern with the approved 232 px sidebar. Inside the 868 px workspace:

1. compact offer header;
2. hero with a prominent listing image on the left and the decision/payment summary on the right, approximately 40/60;
3. full-width Golf comparison;
4. full-width selected-credit detail grid;
5. two-column score and equipment/evidence explanation.

The frame may extend vertically if necessary to keep all credit fields readable. It must not shrink text or hide credit terms to preserve the previous height.

## Mobile Layout

The mobile reference remains 390 px wide and uses a single-column reading order:

1. compact offer identity;
2. full-width listing image with source and original-offer action;
3. verdict and reasons;
4. prominent monthly installment;
5. `Heute`, `Monatlich`, and `Am Ende` payment timeline;
6. Golf comparison;
7. full selected-credit details as stacked label/value rows;
8. alternative scenarios;
9. score explanation;
10. equipment, evidence, and corrections.

Credit details are visible in the reference rather than hidden in a collapsed accordion. Sticky behavior is limited to a compact summary/action bar and must not cover content.

## Interaction Contract

- `Finanzierung ändern` opens scenario selection without leaving the offer.
- `Originalangebot öffnen ↗` opens the exact imported source URL in the default browser and preserves ElektroBrudi's state.
- Selecting a scenario updates the installment, payment timeline, effective Golf comparison, credit details, eligibility, and finance score atomically.
- `Berechnung ansehen` reveals the Golf cost bridge in place.
- Evidence opens as an inspector on desktop and a bottom sheet on mobile.
- Corrections are scoped to the associated attribute and trigger a recalculation notice.
- Back navigation returns to the adapted Overview with its selection and sort/filter state intact.

## Accessibility and Content Rules

- Use a sequential heading hierarchy and a consistent type scale.
- Do not communicate verification or eligibility through color alone.
- Use tabular numerals for financial amounts and right-align comparable values.
- Spell out `Effektiver Jahreszins`; avoid unexplained codes such as `FINANCE_ELIGIBLE` in user-facing copy.
- Keep status copy in German and use plain explanations before model terminology.
- Preserve 44 px minimum mobile targets and visible keyboard focus states.
- Give the listing image useful alternative text; do not put essential financial information inside the image.

## Acceptance Criteria

- The adapted Overview is byte-for-byte untouched by the update path.
- A user can identify the regular monthly installment, initial payment, final payment, and term above the fold.
- A prominent vehicle image, source domain, and original-offer action appear in the opening section.
- Missing or synthetic reference imagery is clearly disclosed and never presented as listing evidence.
- The Golf comparison uses complete effective costs and states what is included.
- All selected-credit details are visible and aligned in logical groups.
- The three leading reasons for the recommendation use plain German.
- Scores, equipment evidence, and corrections explain rather than compete with the decision.
- Desktop and mobile screenshots contain legible text and no clipped or overlapping content.
- Any invented fixture values are explicitly labeled `Beispieldaten`.
