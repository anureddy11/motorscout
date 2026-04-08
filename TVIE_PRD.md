# Product Requirements Document

## Product Name

MotorScout

## Product Vision

MotorScout is a car-deal intelligence product that does two things at launch quality:

- captures inventory across dealers, OEM feeds, and marketplaces within a buyer-defined radius
- ranks that inventory against buyer preferences while exposing how trustworthy the inventory capture actually is

The product should feel like a decision system, not a filter page.

## Launch Product

### 1. Market View

The core experience should let a shopper:

- enter a ZIP code and radius
- choose inventory filters such as condition and fuel type
- set buyer preferences such as budget, body style, mileage tolerance, year floor, and deal-vs-fit weighting
- see ranked listings with explainable reasons
- inspect a selected listing in detail

### 2. Inventory Tracking Quality

Inventory capture must be treated as a first-class product concern.

The left rail should expose an inventory quality score that reflects:

- source coverage
- dealer capture within the radius
- feed freshness
- duplicate overlap reconciliation
- record quality and completeness

The system should never imply perfect market visibility when coverage is weak.

### 3. Ops View

The product should expose operational diagnostics so the team can understand whether inventory is actually being captured comprehensively:

- estimated dealer universe in radius
- in-radius listing volume
- duplicate overlap
- per-source health
- ingestion pipeline stages

### 4. Watchlists And Saved Searches

Users should be able to:

- save strong search setups
- shortlist promising vehicles
- return to their strongest candidates quickly

## Inventory Data Model

Each normalized listing should support fields such as:

- make, model, trim, year
- body style
- fuel type
- condition
- price
- estimated fair value
- mileage
- distance
- source
- list age
- price drop count
- dealer rating
- ownership count
- accident/history flags
- CPO status
- record completeness
- feed freshness
- quality score

## Ranking Model

Each listing should expose:

- deal score
- match score
- quality score
- overall score

Overall score should blend:

- objective value
- user preference fit
- listing quality and trustworthiness

## Launch Screens

- Left rail: search, filters, preferences, inventory confidence
- Market View: summary stats, ranked inventory, selected listing detail
- Ops View: coverage diagnostics and source health
- Watchlists View: saved searches and shortlist

## Next Real Build Steps

- replace seeded data with live adapters
- persist listing snapshots over time
- implement VIN-first deduplication and fuzzy fallback logic
- add alerts when a tracked listing improves or disappears
- add dealer and listing detail pages backed by real historical records
