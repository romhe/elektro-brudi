# ElektroBrudi Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify one editable Figma design file containing the foundations, reusable components, six responsive ElektroBrudi MVP frames, required state examples, and a clickable critical-path prototype.

**Architecture:** Create the design system before composing screens. Use Figma variables, text/effect styles, Auto Layout, component properties, and variants so desktop and mobile views share semantics without duplicating loose groups. Build and validate the file incrementally with `use_figma`, returning node IDs from every mutation and capturing screenshots after each principal frame.

**Tech Stack:** Figma Design, Figma Variables, component sets and variants, Auto Layout, Figma prototyping, Figma MCP `create_new_file`, `use_figma`, `get_metadata`, `get_screenshot`, and `download_assets`

---

## File map

The Figma file is named `ElektroBrudi — MVP UI` and contains exactly these pages:

- `01 · Foundations`: variable swatches, type specimen, spacing/radius/elevation reference, accessibility notes
- `02 · Components`: reusable component sets and documented state variants
- `03 · Desktop`: the three 1440 × 1024 principal frames
- `04 · Mobile`: the three 390 × 844 principal frames
- `05 · Prototype`: critical-path and alternative-state frames connected for review

Repository artifacts:

- Existing design contract: `docs/plans/2026-09-06-elektro-brudi-ui-design.md`
- This execution plan: `docs/superpowers/plans/2026-09-06-elektro-brudi-figma-implementation.md`
- No generated design image is committed to the repository; immutable PNG previews belong on GitHub issue #18.

## Naming and content conventions

- Principal frame names use `Route · State · Dataset`, for example `Overview · Completed · Mixed verification`.
- Components use `Family / Variant`, for example `Status Badge / Verified available`.
- Layers use semantic names such as `Winner heading`, `Monthly delta`, and `Verification explanation`, never `Rectangle 43`.
- German is the product language. Internal Figma variant property values may use concise English identifiers.
- Financial figures use German formatting, euro signs, and tabular numerals.
- The representative winner is a verified Škoda Enyaq; supporting examples include CUPRA Born, VW ID.4, VW ID.3, and one mobile.de-only unverified candidate.

### Task 1: Resolve the Figma destination and inspect capabilities

**Targets:** Authenticated Figma plan, new design file, blank-file inventory

- [ ] **Step 1: Confirm the authenticated Figma plan**

Call `figma_whoami`. If exactly one plan is returned, record its `key`. If more than one plan is returned, present the plan names and wait for the user to select one; never guess a plan key.

- [ ] **Step 2: Create the target design file**

Call `figma_create_new_file` with editor type `design`, name `ElektroBrudi — MVP UI`, and the selected plan key. Record the returned `file_key` and `file_url` verbatim.

- [ ] **Step 3: Inspect the blank file before mutation**

Call `figma_use_figma` read-only with `skillNames: "figma-use,figma-generate-design"`. Return the current page name, all page names, available font families containing `SF Pro`, `SF Compact`, or `Inter`, and local variable collections.

Expected: one blank design page, no product variables, and at least one usable sans-serif font. Prefer `SF Pro Text` and `SF Pro Display`; if unavailable, use `Inter` consistently and document the fallback on Foundations.

- [ ] **Step 4: Check reusable libraries without importing components**

Call `figma_get_libraries` for the new file. Record available libraries for evidence, but do not add a general-purpose UI kit: ElektroBrudi requires its own compact component semantics and no code or Code Connect system exists yet.

### Task 2: Create pages and primitive variable collections

**Targets:** Five named pages; primitive color, number, and string variables

- [ ] **Step 1: Rename the blank page and add the remaining pages**

In one `use_figma` mutation, rename the existing page `01 · Foundations` and create `02 · Components`, `03 · Desktop`, `04 · Mobile`, and `05 · Prototype`. Return every page ID.

- [ ] **Step 2: Create primitive colors**

Create collection `Primitives · Color` with light-mode values:

- `gray/0` `#FFFFFF`
- `gray/25` `#FBFBFD`
- `gray/50` `#F5F5F7`
- `gray/100` `#E8E8ED`
- `gray/200` `#D2D2D7`
- `gray/500` `#6E6E73`
- `gray/900` `#1D1D1F`
- `blue/500` `#007AFF`
- `blue/600` `#0066CC`
- `green/50` `#EAF7EF`
- `green/700` `#16794B`
- `amber/50` `#FFF4D6`
- `amber/700` `#8A5700`
- `orange/50` `#FFF0E6`
- `orange/700` `#A34700`
- `red/50` `#FDECEC`
- `red/700` `#B42318`

Return the collection ID and a name-to-variable-ID map.

- [ ] **Step 3: Create primitive dimensions**

Create collection `Primitives · Dimension` with numeric variables:

- spacing: `0`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`
- radii: `6`, `8`, `10`, `12`, `16`, `999`
- sizes: `control-sm 32`, `control-md 36`, `control-lg 44`, `sidebar 232`, `inspector 360`

Return the collection ID and variable-ID map.

- [ ] **Step 4: Verify primitive collections**

Call `figma_get_variable_defs` on the Foundations page. Expected: two collections and all listed primitive variables with one light-mode value each.

### Task 3: Create semantic variables and styles

**Targets:** Semantic tokens, text styles, effect styles, Foundations reference panels

- [ ] **Step 1: Create semantic colors as aliases**

Create `Semantic · Light` and alias:

- `background/app` → `gray/50`
- `background/sidebar` → `gray/25`
- `surface/primary` → `gray/0`
- `surface/subtle` → `gray/25`
- `border/default` → `gray/200`
- `text/primary` → `gray/900`
- `text/secondary` → `gray/500`
- `action/primary` → `blue/500`
- `action/primary-hover` → `blue/600`
- status foreground/background pairs for verified, discovered, partial, waiting, failed, and removed using the corresponding primitive colors.

- [ ] **Step 2: Create text styles**

Load the chosen font before every text mutation. Create:

- `Display / Page title`: 28/34, semibold
- `Heading / Section`: 20/25, semibold
- `Heading / Card`: 16/21, semibold
- `Body / Default`: 14/20, regular
- `Body / Emphasis`: 14/20, semibold
- `Body / Small`: 12/16, regular
- `Label / Control`: 13/17, medium
- `Number / Hero`: 32/36, semibold, tabular figures where supported
- `Number / Data`: 14/18, medium, tabular figures where supported

- [ ] **Step 3: Create elevation styles**

Create `Elevation / Card` with a restrained drop shadow and `Elevation / Floating` for drawers and sheets. Add a one-pixel separator style through the semantic border token; avoid decorative shadows on ordinary form rows.

- [ ] **Step 4: Build the Foundations reference frame**

On `01 · Foundations`, create an Auto Layout frame named `Foundations · Light` containing color roles, type specimen, spacing scale, radii, elevation, and the note `Light mode only · system dark mode is outside MVP scope`.

- [ ] **Step 5: Validate Foundations visually**

Capture an inline screenshot and inspect for clipped labels, incorrect font weights, unreadable status pairs, or missing token names. Fix any discrepancy before continuing.

### Task 4: Build shell and action components

**Targets:** App shell primitives, buttons, navigation, fields, alerts, dialogs

- [ ] **Step 1: Create button variants**

Create `Button` variants for primary, secondary, and destructive appearances; default, hover, focused, disabled, and loading states; small, medium, and large sizes. Include leading-icon and label properties. The mobile large variant is at least 44 px high.

- [ ] **Step 2: Create navigation components**

Create `Sidebar Item` with default, selected, and focused variants; `Top Toolbar`; `Desktop Sidebar`; and `Mobile Navigation`. Use icons plus labels for Overview and Settings. Include local-only, Crawl4AI, and model-status utility rows.

- [ ] **Step 3: Create form components**

Create `Form Field` variants for default, focused, error, disabled, and success. Include persistent label, optional helper text, localized numeric suffix, and error text. Add a macOS-style `Section Picker` and `Segmented Control`.

- [ ] **Step 4: Create feedback components**

Create `Inline Alert` variants for info, success, warning, and error. Create `Confirm Dialog` and a mobile `Bottom Sheet` shell with title, close control, body slot, and action row.

- [ ] **Step 5: Validate components structurally**

Call `figma_get_metadata` on the Components page. Expected: component sets rather than duplicated frames, explicit variant properties, Auto Layout on every structural container, and semantic layer names.

### Task 5: Build verification and progress components

**Targets:** Status badge, job progress, model download, source classification

- [ ] **Step 1: Create status variants**

Build `Status Badge` variants for `verified`, `discovered`, `partial`, `waiting`, `failed`, and `removed`. Every variant contains an icon and full German text; none relies on color alone.

- [ ] **Step 2: Create source classification**

Build `Source Classification` variants for known search, known detail, mobile.de discovery, generic detail, and unsupported unknown search. The unsupported variant explains that an adapter is required.

- [ ] **Step 3: Create job progress**

Build `Job Progress` variants for QUEUED, CRAWLING, WAITING_FOR_LOCAL_LLM, NORMALIZING, COMPLETED, PARTIAL, FAILED, and CANCELLED. Include pages processed, details found/verified/failed, current action, start time, and contextual Retry or Cancel action.

- [ ] **Step 4: Create model download**

Build `Model Download` default, downloading, ready, and failed variants. The downloading variant shows percent and bytes, and the component notes its reduced-motion presentation.

- [ ] **Step 5: Visually validate diagnostic states**

Screenshot the component sets at readable scale. Verify that discovered and partial are unmistakable, waiting is not presented as failure, and failed refresh states preserve room for a last-known-data explanation.

### Task 6: Build decision and offer components

**Targets:** Import, winner, reference delta, score, offer table/card

- [ ] **Step 1: Create URL import**

Build `URL Import` variants for empty, classifying, valid, invalid, and unsupported. Include one HTTPS field, detected source, primary import action, and localized inline error.

- [ ] **Step 2: Create winner cards**

Build `Winner Card` variants for best verified, lowest financing cost, highest equipment, lowest cash price, best unverified candidate, and no verified winner. Only the best-verified variant uses the dominant winner treatment.

- [ ] **Step 3: Create reference delta**

Build `Reference Delta` with normal Golf baseline, repair-year scenario, EV monthly cost, and savings/additional-cost delta. Include a link-style action to Settings and a note that Mercedes fixed costs are excluded from savings.

- [ ] **Step 4: Create score breakdown**

Build `Score Breakdown` showing Finance 70%, Equipment 30%, and Verification as a separate gate. Add compact and expanded variants.

- [ ] **Step 5: Create responsive offer representations**

Build `Offer Row` for desktop and `Offer Card` for mobile. Include vehicle, cash price, mileage/registration, verification, refresh state, cheapest eligible scenario, effective monthly cost, Golf delta, equipment points, and total score.

- [ ] **Step 6: Validate decision hierarchy**

Screenshot the component group. Confirm that the verified winner leads, the monthly delta is readable before secondary metrics, and unverified candidates are visually subordinate.

### Task 7: Build evidence, equipment, and finance components

**Targets:** Evidence inspector, correction controls, equipment states, finance cards

- [ ] **Step 1: Create evidence inspector**

Build desktop `Evidence Drawer` and mobile `Evidence Sheet` with snapshot time, extractor, confidence, source section, evidence excerpt, canonical URL, and open-source action.

- [ ] **Step 2: Create correction controls**

Add variants for confirm, replace, mark unknown, user-confirmed, and revert. Show original value and evidence alongside the current canonical value. Include an optional reason field.

- [ ] **Step 3: Create equipment state control**

Build exactly PRESENT, ABSENT, UNKNOWN, PREPARED_ONLY, and SUBSCRIPTION_REQUIRED variants. Show weight and point impact; only PRESENT displays awarded points.

- [ ] **Step 4: Create finance scenario cards**

Build Cash, Dealer finance, Custom credit, and Provider template variants, with eligible, ineligible, and invalid-mathematics states. Show down payment, regular rate, term, balloon, interest, fees, total outlay, credit cost, and all eligibility reasons.

- [ ] **Step 5: Validate finance integrity**

Screenshot finance cards. Confirm that total outlay has stronger emphasis than monthly rate and that down payment and balloon are visible without expanding the card.

### Task 8: Compose the three desktop frames

**Targets:** `03 · Desktop`, three 1440 × 1024 frames

- [ ] **Step 1: Create desktop skeletons**

Create `Overview · Completed · Mixed verification`, `Offer detail · Verified · Evidence conflict`, and `Settings · Reference profile · Saved`, each 1440 × 1024. Add AppShell, sidebar, toolbar, and placeholder Auto Layout regions. Return all frame and region IDs.

- [ ] **Step 2: Fill the desktop Overview above the fold**

Populate URL import, completed-job summary, best verified Enyaq card, and Golf delta. Use realistic German copy and values derived from the approved profile, including the approximately EUR 427–428 monthly Golf baseline.

- [ ] **Step 3: Fill the desktop Overview offer area**

Add four supporting winner cards, filters, and five offer rows. Include one discovered-only mobile.de candidate and one partial/stale entry so status hierarchy is visible.

- [ ] **Step 4: Fill the desktop Offer detail header and facts**

Add Enyaq title, price, score, verified status, timestamps, source, vehicle facts, and equipment. Show one conflict such as battery capacity or ACC evidence to activate the inspector.

- [ ] **Step 5: Fill the desktop Offer detail finance and evidence**

Add Cash, Dealer finance, and Custom credit cards; Reference Delta; expanded Score Breakdown; and the evidence inspector with correction controls.

- [ ] **Step 6: Fill the desktop Settings frame**

Open `Referenz & Betriebskosten`. Include Golf, Mercedes, EV distance, electricity, PV, insurance, and maintenance fields; a live baseline panel; saved state; and recalculation notice.

- [ ] **Step 7: Validate desktop frames**

Capture each frame. Verify 1440 × 1024 dimensions, no clipped content, consistent 232 px sidebar, visible primary actions, legible table density, and a clear answer-first scan path.

### Task 9: Compose the three mobile frames

**Targets:** `04 · Mobile`, three 390 × 844 frames

- [ ] **Step 1: Create mobile skeletons**

Create `Overview · Completed · Mixed verification`, `Offer detail · Verified · Evidence conflict`, and `Settings · Reference profile · Saved`, each 390 × 844. Add mobile navigation, compact toolbar, and stacked Auto Layout regions.

- [ ] **Step 2: Fill mobile Overview**

Place URL import above the fold, followed by compact progress, verified winner, stacked Golf comparison, collapsed supporting winners, and offer cards. Do not use a horizontally scrollable table.

- [ ] **Step 3: Fill mobile Offer detail**

Add sticky compact summary; disclosures for vehicle, equipment, finance, and score; a visible evidence action; and thumb-accessible refresh and financing actions. Represent the evidence inspector as a bottom-sheet overlay example.

- [ ] **Step 4: Fill mobile Settings**

Add section picker, grouped native-style form rows, sticky baseline summary, inline saved feedback, and a 44 px minimum save action.

- [ ] **Step 5: Validate mobile frames**

Capture each frame at original resolution. Verify exactly 390 × 844, no horizontal overflow, no clipped German labels, touch targets at least 44 px, and primary actions visible without ambiguous icon-only controls.

### Task 10: Build required state examples

**Targets:** Components and Prototype pages

- [ ] **Step 1: Add overview state strip**

Create compact examples for empty, invalid URL, CRAWLING, WAITING_FOR_LOCAL_LLM, first model download, PARTIAL with reason, FAILED with Retry, only-unverified results, offline, and Crawl4AI unreachable.

- [ ] **Step 2: Add offer-detail state strip**

Create examples for conflict, missing evidence, USER_CONFIRMED correction, all five equipment states, eligible finance, ineligible finance, and invalid mathematics.

- [ ] **Step 3: Add settings state strip**

Create examples for saved, validation error, missing Keychain credential, connection-test failure, and recalculation required.

- [ ] **Step 4: Validate state coverage**

Compare the examples against the Required states section of `docs/plans/2026-09-06-elektro-brudi-ui-design.md`. Expected: every state has one inspectable example and none introduces watchlists, alerts, schedulers, prompt export, TCO, or residual-value UI.

### Task 11: Wire the clickable prototype

**Targets:** `05 · Prototype`, prototype interactions and annotations

- [ ] **Step 1: Duplicate only the frames needed for interaction**

Use component variants and overlays for state transitions. Keep one primary-flow frame per meaningful layout change; do not duplicate a frame merely to change a badge.

- [ ] **Step 2: Connect the import flow**

Wire empty Overview → valid URL → CRAWLING → WAITING_FOR_LOCAL_LLM → COMPLETED Overview. Provide alternative links to invalid URL, PARTIAL, FAILED, and first-download examples.

- [ ] **Step 3: Connect the evidence and correction flow**

Wire winner/offer selection → Offer detail → Evidence Drawer/Sheet overlay → correction state → updated detail.

- [ ] **Step 4: Connect finance and settings**

Wire add-financing → finance form/card → updated comparison → Settings → edited reference profile → recalculation notice → Overview.

- [ ] **Step 5: Define interaction behavior**

Use restrained dissolve or smart-animate transitions no longer than 180 ms. Document reduced motion as instant transitions. Drawers and sheets close through explicit controls and Escape where applicable.

- [ ] **Step 6: Test the critical path**

Starting from the prototype entry frame, click the full critical path without selecting layers manually. Expected: every forward action and close/back action resolves, overlays do not trap the user, and the final Settings-to-Overview action returns to an updated comparison.

### Task 12: Document accessibility and implementation handoff

**Targets:** Foundations annotations and named implementation specs

- [ ] **Step 1: Add accessibility annotations**

Document desktop tab order, mobile focus order, visible focus ring, status text requirements, live-region content for job progress and save feedback, 44 px touch targets, AA contrast, and reduced-motion behavior.

- [ ] **Step 2: Add responsive annotations**

Document the 232 px desktop sidebar, 360 px evidence inspector, mobile table-to-card conversion, disclosure behavior, sticky summaries, and the prohibition on horizontal page scrolling at 390 px.

- [ ] **Step 3: Add data and status guardrails**

Annotate that only verified, fully refreshed, finance-eligible offers can win; mobile.de-only remains discovered; crawl failure preserves last-known data; the LLM cannot set availability or finance; and only PRESENT equipment earns points.

- [ ] **Step 4: Verify implementation readiness**

Inspect every principal frame name and component property. Expected: issues #19, #20, and #37 can derive copy, spacing, components, states, and responsive behavior without a new product decision.

### Task 13: Final structural and visual verification

**Targets:** Entire Figma file and immutable previews

- [ ] **Step 1: Run a structural inventory**

Use `figma_get_metadata` or a read-only `use_figma` traversal to return page names, principal frame names and dimensions, component-set names, variable collection names, detached-instance count, and unnamed-layer count.

Expected: five pages; six principal frames at exact sizes; required component families present; no accidental detached instances; no generic names in principal frames.

- [ ] **Step 2: Run an overflow and typography audit**

Traverse principal frames for nodes extending beyond frame bounds, text nodes with zero or implausibly narrow width, clipped text, missing font loads, and non-Auto-Layout structural groups. Fix every result and rerun the audit.

- [ ] **Step 3: Run a semantic audit**

Verify status is never color-only, discovered and partial are explicit, Finance 70% and Equipment 30% are labeled, Verification remains a gate, and monthly rates retain down-payment and balloon context.

- [ ] **Step 4: Capture final screenshots**

Capture all six principal frames at readable resolution. Inspect them individually and as a set for hierarchy, consistency, desktop/mobile parity, and macOS-native restraint.

- [ ] **Step 5: Export immutable PNG previews**

Use `figma_download_assets` for each principal frame as PNG. Preserve the six returned files for attachment to issue #18 without editing or recompression.

- [ ] **Step 6: Publish the handoff to GitHub issue #18**

Add one issue comment containing the Figma URL, a concise inventory of the six frames and prototype, and all six PNG previews embedded as GitHub-hosted attachments. Reopen the links after posting to verify the Figma file and every image resolve.

- [ ] **Step 7: Close and verify GitHub issue #18**

After the Figma URL and all six GitHub-hosted PNG previews resolve, close issue #18 with reason `completed`. Refresh the issue and verify its state is `CLOSED`, the handoff comment remains visible, and issues #19, #20, and #37 still reference #18 as their design dependency.

- [ ] **Step 8: Record final evidence**

Report the Figma file URL, page/frame inventory, prototype entry point, final screenshot verification, GitHub comment URL, closed issue URL/state, and any documented font fallback. Do not claim completion until every item above is confirmed at the final Figma and GitHub state.
