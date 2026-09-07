# ElektroBrudi UI Design

**Date:** 2026-09-06  
**Status:** Approved  
**Source:** GitHub issues #1, #10, #18, #19, #20, and #37

## Objective

Design a three-page editable Figma file that establishes ElektroBrudi's visual guidelines, component language, and polished Overview/Import experience. The system must provide enough representative Offer Detail and Settings patterns to make subsequent responsive HTML mockups deterministic. The experience should combine a trustworthy, data-rich decision cockpit with the restraint and familiarity of a native macOS utility.

The design must help the user answer one question quickly: which currently verified electric-car offer is the best practical and financial choice compared with keeping the Golf?

## Product boundaries

The MVP contains exactly three primary areas:

1. Overview and URL import
2. Offer detail
3. Settings

It excludes watchlists, alerts, schedulers, prompt export, leasing workflows, residual-value projections, long-term TCO, and an operations dashboard.

Verification is a gate, not a score bonus. Search snippets and mobile.de-only discoveries cannot be presented as verified availability. Partial refreshes and transient crawl failures must not imply that a vehicle was sold or removed.

## Design direction

### Sidebar decision cockpit

The selected direction uses a macOS-style navigation sidebar with a focused decision canvas. It combines:

- quiet, native-feeling application chrome;
- compact, evidence-rich content;
- answer-first winner and cost comparisons;
- explicit status and provenance;
- sheets, drawers, disclosures, and dialogs that feel familiar on macOS without copying system applications literally.

Desktop uses a 232 px sidebar. Mobile replaces the sidebar with compact top navigation and bottom sheets.

### Visual language

- Light mode only for the MVP.
- SF Pro where available, with system fallbacks.
- Tabular figures for financial values, scores, and counters.
- Soft neutral surfaces, restrained blue primary actions, subtle separators, and minimal shadows.
- Corner radii generally between 10 and 12 px.
- Semantic colors always paired with icons and text.
- Visible keyboard focus, WCAG AA contrast, and reduced-motion progress variants.
- Minimum 44 x 44 px touch targets on mobile.

## Information architecture

### Application shell

The desktop sidebar contains Overview, contextual offer navigation, and Settings. Its utility area shows local-only operation, Crawl4AI reachability, and local-model readiness.

The top toolbar contains the current page title and only the actions relevant to that page. The shell should remain visually quiet so the current decision state leads the page.

### Overview and import

The overview reads from action to answer:

1. URL import with source classification
2. Active job progress when applicable
3. Best verified offer
4. Supporting winner categories
5. Golf cost comparison
6. Filterable, sortable offer list

The winner is visually dominant only when it is fully verified and gate-eligible. Unverified or partial candidates must not visually compete with it.

### Offer detail

The detail view starts with a summary of the vehicle, price, verification state, refresh state, score, and primary actions.

On desktop, decision content occupies the main column while trust and provenance occupy an inspector column. The page covers:

- vehicle facts;
- equipment and point impact;
- cash and financing scenarios;
- monthly cost and Golf delta;
- score composition;
- source, timestamps, evidence, confidence, and conflicts.

Selecting an extracted value opens an evidence inspector. A user can confirm, replace, mark unknown, or reverse a prior correction without obscuring the original evidence.

### Settings

Settings are divided into Crawl4AI, local model, equipment weights, financing, reference vehicles and energy, and insurance and maintenance.

Each section validates and saves independently. A live baseline summary remains visible on desktop and sticky on mobile. Profile changes visibly mark existing evaluations for recalculation while leaving source snapshots untouched.

## Visual hierarchy

Information is ordered consistently:

1. **Answer:** winner, monthly delta, and verification outcome
2. **Action:** import, refresh, inspect evidence, and add financing
3. **Explanation:** score composition, assumptions, and provenance
4. **Diagnostics:** crawl progress, partial results, connectivity, and model state

This hierarchy changes temporarily while work is active: job progress becomes the focal element during crawling or local-model inference, then yields to the decision summary after completion.

## Component system

The Figma file defines variables for color, typography, spacing, radius, and shadow. Layouts use Auto Layout. Repeated states use component variants rather than duplicated groups.

Required components:

- AppShell
- TopNav
- URLImport
- JobProgress
- StatusBadge
- WinnerCard
- ReferenceDelta
- OfferTable and OfferCard
- ScoreBreakdown
- EvidenceDrawer
- EquipmentStateControl
- FinanceScenarioCard
- FormField
- InlineAlert
- ConfirmDialog
- ModelDownload

### Status semantics

- Green shield plus text: Verified available
- Amber compass plus text: Discovered, not verified
- Orange incomplete-circle icon plus text: Partially updated
- Gray clock plus text: Waiting for local model
- Red warning plus text: Refresh failed
- Neutral strike-through treatment plus text: Sold or removed

PARTIAL and DISCOVERED_UNVERIFIED receive full explanatory treatments. Color alone never communicates state.

Equipment exposes five distinct states: PRESENT, ABSENT, UNKNOWN, PREPARED_ONLY, and SUBSCRIPTION_REQUIRED. Only PRESENT contributes points. Missing and not mentioned must never look equivalent.

Finance cards expose down payment, monthly rate, term, balloon, interest, fees, total outlay, credit cost, and eligibility reasons. Monthly rate is never emphasized without down payment and balloon context.

## Key frames and representative sections

### Overview / Desktop — 1440 x 1024

- URL import and refresh actions
- Compact completed-job summary
- Dominant verified-winner card
- Golf monthly-cost comparison
- Four supporting winner metrics
- Dense, sortable offer table
- Clearly contrasting unverified candidate

### Overview / Mobile — 390 x 844

- Import and primary action above the fold
- Active progress followed by the winner card
- Stacked Golf comparison
- Collapsible supporting winners
- Offer cards containing status, effective monthly cost, delta, and score

### Offer detail / Representative desktop section

- Verified Skoda Enyaq example
- Summary header with price, score, status, and refresh
- Vehicle and equipment content
- Source and evidence inspector
- Cash, dealer-finance, and custom-credit scenarios
- Monthly-cost and Golf-delta summary
- One conflicting field that demonstrates correction

### Offer detail / Representative mobile section

- Sticky compact offer summary
- Disclosures for vehicle, equipment, finance, and score
- Evidence in a bottom sheet
- Thumb-accessible primary actions
- No compressed desktop tables

### Settings / Representative desktop section

- Section navigation
- Reference and operating-cost section open by default
- Editable Golf, Mercedes, EV-use, energy, insurance, and maintenance inputs
- Sticky live baseline preview around EUR 427–428 per month
- Recalculation notice and section-scoped save action

### Settings / Representative mobile section

- Section picker rather than a second sidebar
- Grouped native-style form rows
- Sticky baseline summary
- Inline save and validation feedback

## Responsive behavior

Desktop uses a compact combination of tables and cards. Mobile preserves the answer-first order, stacks data, converts tables to cards, and moves contextual detail into disclosures or bottom sheets. The 390 px layout must have no horizontal page scrolling.

## Required states

The component pages and prototype demonstrate:

- empty overview;
- valid and invalid URL classification;
- CRAWLING with page and detail counters;
- WAITING_FOR_LOCAL_LLM;
- first model download with percentage and byte progress;
- COMPLETED;
- PARTIAL with a reason;
- FAILED with retry and retained last-known data;
- best verified offer;
- only unverified candidates;
- detail conflict or missing evidence;
- all five equipment states;
- eligible, ineligible, and mathematically invalid finance;
- settings saved, validation failed, and Keychain credential missing;
- offline or Crawl4AI unreachable.

## Prototype

The primary clickable journey is:

`Empty overview -> URL validated -> CRAWLING -> WAITING_FOR_LOCAL_LLM -> COMPLETED -> Open offer -> Inspect evidence -> Correct value -> Add financing -> See updated comparison -> Change settings`

Alternative branches cover invalid or unsupported URLs, partial crawls, failed refreshes, no verified winner, initial model download, missing Keychain credentials, and invalid financing mathematics.

State branches should be modeled through component variants and focused examples rather than duplicating full application pages. The Figma prototype concentrates on Overview/Import and links to representative Detail and Settings sections; complete responsive Detail and Settings flows belong to later HTML mockups.

## Figma file structure

The Starter-plan-compatible design file contains exactly these pages:

1. `01 · Foundations & Guidelines`
2. `02 · Components & States`
3. `03 · Key Screens`

The Key Screens page contains the polished 1440 x 1024 and 390 x 844 Overview/Import frames, the critical import-state sequence, and representative Offer Detail and Settings sections for desktop and mobile. Every frame is named with route, state, and data assumption. Components use variables and variants.

## Acceptance criteria

- The polished Overview/Import frames exist at exactly 1440 x 1024 and 390 x 844.
- Desktop and mobile Overview implement the same product hierarchy without horizontal scrolling at 390 px.
- Representative Offer Detail and Settings sections define layout, evidence, finance, form, responsive, and interaction patterns for later HTML mockups.
- Verification, freshness, and extraction confidence remain visually distinct.
- A verified winner cannot be confused with an unverified or partial candidate.
- Finance never promotes a monthly rate without its material conditions.
- Evidence and user corrections remain discoverable and reversible.
- Keyboard order, focus treatments, labels, helper text, error text, and reduced-motion behavior are documented.
- The file is editable and defines a coherent design guideline and language for issues #19, #20, and #37 and their HTML mockups.
