# reservation-date-picker Specification

## Purpose

Provide an accessible animated date picker for the reservation form while preserving the native date field contract. Support single-date booking and an optional reusable range mode without external dependencies.

## Requirements

### Requirement: Preserve the native date interface
The picker SHALL retain the native date input, ISO value, constraints, validity and input/change events. The visible trigger SHALL display YYYY/MM/DD and sync() SHALL reflect external value updates, disabled state and validation attributes.

#### Scenario: Select a date
- **WHEN** a user selects 2026-11-19 in single mode
- **THEN** the native value is 2026-11-19, the trigger displays 2026/11/19, existing reservation views update, and the popover closes after selection feedback

#### Scenario: Reset or externally update the field
- **WHEN** the form resets or a caller updates the value and invokes sync()
- **THEN** the trigger reflects the native value without a duplicate change event

##### Example: External update and reset
- **GIVEN** a native field whose default value is 2026-11-18 and a change-event counter of 0
- **WHEN** a caller sets 2026-12-25 and invokes sync(), then resets the form
- **THEN** the trigger first displays 2026/12/25, then 2026/11/18, and the change-event counter remains 0


<!-- @trace
source: enhance-reservation-date-picker
updated: 2026-11-17
code:
  - date-picker.css
  - date-picker.js
  - docs/DATE_PICKER.md
  - reservation405.html
  - script.js
  - tests/date-picker.browser.js
  - tests/date-picker.html
  - tests/date-picker.test.cjs
-->

---
### Requirement: Provide navigable date and month views
The picker SHALL open from the trigger, navigate previous and next months with directional feedback, adapt the calendar viewport to its month, and toggle between dates and a twelve-month overview using the title.

#### Scenario: Navigate between calendar densities
- **WHEN** a user navigates from 2026-05 to 2026-06
- **THEN** the calendar changes from 42 to 35 cells while retaining usable month navigation

#### Scenario: Select a month from the overview
- **WHEN** a user activates the title and selects December
- **THEN** the overview returns to the December date view

##### Example: December overview selection
- **GIVEN** the date view is November 2026
- **WHEN** the user activates the title and selects month 12
- **THEN** the date view displays 2026-12 and contains 35 date cells


<!-- @trace
source: enhance-reservation-date-picker
updated: 2026-11-17
code:
  - date-picker.css
  - date-picker.js
  - docs/DATE_PICKER.md
  - reservation405.html
  - script.js
  - tests/date-picker.browser.js
  - tests/date-picker.html
  - tests/date-picker.test.cjs
-->

---
### Requirement: Reject unavailable dates with an explanation
The picker SHALL reject dates outside native min/max or rejected by getUnavailableReason, preserve the selected value, and present an accessible explanation. The reservation adapter SHALL identify a date as fully booked only after data loads and every existing half-hour start is unavailable under existing lunch and overlap rules.

#### Scenario: Reject a fully booked fixture date
- **WHEN** a user activates 2026-11-20 and the availability callback returns a full-booking reason
- **THEN** the selected value remains unchanged and the reason is displayed above the date


<!-- @trace
source: enhance-reservation-date-picker
updated: 2026-11-17
code:
  - date-picker.css
  - date-picker.js
  - docs/DATE_PICKER.md
  - reservation405.html
  - script.js
  - tests/date-picker.browser.js
  - tests/date-picker.html
  - tests/date-picker.test.cjs
-->

---
### Requirement: Support optional range selection
The picker SHALL default to single mode. In range mode it SHALL preview the inclusive interval during pointer, touch or keyboard navigation, commit an available interval, display its calendar-night count and emit date-range-change with {start,end,nights}. It SHALL reject intervals containing unavailable dates. The booking form SHALL remain in single mode.

#### Scenario: Commit an available interval
- **WHEN** a user selects 2026-11-21 followed by 2026-11-24 in range mode
- **THEN** the native start is 2026-11-21 and the range event contains start 2026-11-21, end 2026-11-24 and nights 3

##### Example: Calendar-night boundaries
| Start | End | Nights |
| --- | --- | --- |
| 2028-02-28 | 2028-03-01 | 2 |
| 2026-12-31 | 2027-01-01 | 1 |
| 2026-11-21 | 2026-11-21 | 0 |

#### Scenario: Reject an unavailable interval
- **WHEN** a range endpoint would include a date rejected by the availability callback
- **THEN** the interval is not committed and an explanation is presented

##### Example: Blocked date inside an interval
- **GIVEN** a range starts at 2026-11-18 and the callback rejects 2026-11-20
- **WHEN** the user selects 2026-11-21 as the endpoint
- **THEN** the start remains 2026-11-18, the end remains null, and an unavailable-interval explanation is presented


<!-- @trace
source: enhance-reservation-date-picker
updated: 2026-11-17
code:
  - date-picker.css
  - date-picker.js
  - docs/DATE_PICKER.md
  - reservation405.html
  - script.js
  - tests/date-picker.browser.js
  - tests/date-picker.html
  - tests/date-picker.test.cjs
-->

---
### Requirement: Support keyboard access and reduced motion
The picker SHALL support arrow navigation, Enter selection, Escape dismissal and usable Tab focus movement. It SHALL honor prefers-reduced-motion with opacity-only feedback and remove animated transforms and animated height from that mode.

#### Scenario: Select with the keyboard
- **WHEN** a user moves from December 18 to December 19 with ArrowRight and activates Enter
- **THEN** December 19 is selected and focus returns to the trigger when the popover closes

#### Scenario: Reduce motion
- **WHEN** the system prefers reduced motion
- **THEN** selection, transition and invalid-date feedback use 130ms opacity-only animation

<!-- @trace
source: enhance-reservation-date-picker
updated: 2026-11-17
code:
  - date-picker.css
  - date-picker.js
  - docs/DATE_PICKER.md
  - reservation405.html
  - script.js
  - tests/date-picker.browser.js
  - tests/date-picker.html
  - tests/date-picker.test.cjs
-->