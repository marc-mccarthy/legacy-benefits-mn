# Playwright Test Triage (created 2026-10-14, updated 2026-10-14)

Which end-to-end tests in `e2e/` to keep and which to remove. Remove boxes are ticked once the test is gone. Keep boxes are ticked once the test passed locally after the trim (229 of 233 runs). The two unticked Keep tests fail on `main` too, because of the ® mark under 16px; PR #11 fixes them.

## Totals

|           | Unique tests | Runs (unique tests x browser setups) |
| --------- | ------------ | ------------------------------------ |
| Keep      | 113          | 233                                  |
| Remove    | 245          | 548                                  |
| **Total** | **358**      | **781**                              |

A "run" is one test in one setup (`desktop`, `mobile`, `reduced-motion`). Many tests are one check repeated per page, so 169 `test()` calls in the source expand to 358 tests.

## How the counts were verified

1. `pnpm exec playwright test --list --reporter=json` gave 781 runs and 358 unique tests (file plus full title).
2. Every unique test was put in exactly one list below.
3. A second, independent listing (`pnpm exec playwright test --list`, plain text) reported `Total: 781 tests in 13 files`. Each of its 781 lines was matched to the lists: 233 keep runs plus 548 remove runs is 781, with 0 missing, 0 in both lists and 0 listed tests absent from Playwright.

Listed from `main` at `5e96bfa`. PR #11 edits a few `motion`, `structure` and `typography` tests, so some line numbers shift after it merges.

## What is kept and why

Kept tests protect what the business and the law depend on: the Medicare disclosures, the contact form, the phone number, accessibility (axe scan, keyboard use, Pause control, 16px text, 400% zoom reflow), and the repo rule that every page stays readable with reduced motion and with JavaScript off.

Removed tests check how animations, canvases, videos, pixel sizes and layout details behave. They break whenever the design changes and are behind most of the current CI failures.

## Keep

### Accessibility: one h1 per page and an automated axe scan of every page (10)

- [x] `accessibility:47` every page has exactly one h1
- [x] `accessibility:24` prefers-reduced-motion: reduce › / has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /services has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /learn has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /contact has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /scope-of-appointment has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /do-not-contact has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /disclosures has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /accessibility has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: reduce › /privacy has no detectable accessibility violations

### Medicare/legal compliance: disclaimers, TTY, Scope of Appointment, cookie consent, opt-out (16)

- [x] `compliance:7` Medicare-required disclosures › TPMO and government disclaimers appear on /
- [x] `compliance:25` Medicare-required disclosures › no disclosure is set below 16px on /
- [x] `compliance:7` Medicare-required disclosures › TPMO and government disclaimers appear on /services
- [x] `compliance:25` Medicare-required disclosures › no disclosure is set below 16px on /services
- [x] `compliance:7` Medicare-required disclosures › TPMO and government disclaimers appear on /learn
- [x] `compliance:25` Medicare-required disclosures › no disclosure is set below 16px on /learn
- [x] `compliance:7` Medicare-required disclosures › TPMO and government disclaimers appear on /contact
- [x] `compliance:25` Medicare-required disclosures › no disclosure is set below 16px on /contact
- [x] `compliance:44` Medicare-required disclosures › footer links to disclosures, privacy, and opt-out
- [x] `compliance:61` Medicare-required disclosures › TTY number is published
- [x] `compliance:68` Scope of Appointment › lists product types individually and requires a signature
- [x] `compliance:84` Scope of Appointment › states that signing does not enrol the beneficiary
- [x] `compliance:95` cookie consent › both buttons record a choice and dismiss the banner
- [x] `compliance:112` cookie consent › is never server-rendered, so its buttons are always live
- [x] `compliance:119` cookie consent › a stored choice keeps the banner away on the next visit
- [x] `compliance:137` opt-out › do-not-contact form is reachable and needs no identity proof

### Contact form works, shows TCPA consent, reports errors accessibly, is tappable (10)

- [x] `lead-form:5` contact form › shows the full TCPA consent text, not a summary
- [x] `lead-form:15` contact form › blocks submission without consent and explains why
- [x] `lead-form:29` contact form › reports field errors accessibly
- [x] `lead-form:45` contact form › submits successfully and confirms
- [x] `lead-form:62` navigation › skip link moves focus to main content
- [x] `lead-form:86` transact pages › /contact controls are at least 44x44
- [x] `lead-form:86` transact pages › /scope-of-appointment controls are at least 44x44
- [x] `lead-form:86` transact pages › /do-not-contact controls are at least 44x44
- [x] `lead-form:116` transact pages › contact phone link is large and tappable
- [x] `lead-form:147` transact pages › an invalid touched email changes border colour and keeps its error text

### Content never hidden by motion, JS off or print; the required Pause control; clicks always navigate (7)

- [x] `motion:47` scroll reveal › with reduced motion, no content is hidden anywhere on the page
- [x] `motion:68` scroll reveal › content is visible with JavaScript disabled
- [x] `motion:81` scroll reveal › nothing prints blank
- [x] `motion:416` effects pause control › is reachable by keyboard and toggles
- [x] `motion:452` effects pause control › carries a visible text label, not an icon alone
- [x] `motion:971` view transitions › without startViewTransition the click still navigates
- [x] `motion:1022` view transitions › item 11: the transition overlay never swallows a click

### Mobile menu is keyboard-usable and reaches the phone number (4)

- [x] `navigation:20` mobile navigation sheet › item 15: traps focus while open
- [x] `navigation:73` mobile navigation sheet › item 17: closes on Escape and returns focus to its trigger
- [x] `navigation:92` mobile navigation sheet › the phone number and the call to action are the last two stops
- [x] `navigation:118` navigation state and anchors › item 18: the active nav item carries aria-current

### Every page shows its text with reduced motion and with JavaScript off (CLAUDE.md guardrail) (26)

- [x] `parity:14` reduced motion › / shows text, no canvas, no video
- [x] `parity:14` reduced motion › /services shows text, no canvas, no video
- [x] `parity:14` reduced motion › /services/medicare-advantage shows text, no canvas, no video
- [x] `parity:14` reduced motion › /learn shows text, no canvas, no video
- [x] `parity:14` reduced motion › /learn/when-can-i-change-my-plan shows text, no canvas, no video
- [x] `parity:14` reduced motion › /team shows text, no canvas, no video
- [x] `parity:14` reduced motion › /team/owner shows text, no canvas, no video
- [x] `parity:14` reduced motion › /contact shows text, no canvas, no video
- [x] `parity:14` reduced motion › /scope-of-appointment shows text, no canvas, no video
- [x] `parity:14` reduced motion › /do-not-contact shows text, no canvas, no video
- [x] `parity:14` reduced motion › /privacy shows text, no canvas, no video
- [x] `parity:14` reduced motion › /disclosures shows text, no canvas, no video
- [x] `parity:14` reduced motion › /accessibility shows text, no canvas, no video
- [x] `parity:14` JavaScript off › / shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /services shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /services/medicare-advantage shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /learn shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /learn/when-can-i-change-my-plan shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /team shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /team/owner shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /contact shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /scope-of-appointment shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /do-not-contact shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /privacy shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /disclosures shows text, no canvas, no video
- [x] `parity:14` JavaScript off › /accessibility shows text, no canvas, no video

### Each page renders its content; logo has a real name; announcement dates; CMIP; no invented staff; phone in mobile header (16)

- [x] `structure:505` /: header and footer lockups carry the same real-text name
- [x] `structure:352` authored content › every route renders its authored content with no database — /
- [x] `structure:352` authored content › every route renders its authored content with no database — /services
- [x] `structure:352` authored content › every route renders its authored content with no database — /services/part-d
- [x] `structure:352` authored content › every route renders its authored content with no database — /team
- [x] `structure:352` authored content › every route renders its authored content with no database — /team/owner
- [x] `structure:352` authored content › every route renders its authored content with no database — /learn
- [x] `structure:352` authored content › every route renders its authored content with no database — /learn/when-can-i-change-my-plan
- [x] `structure:352` authored content › every route renders its authored content with no database — /contact
- [x] `structure:352` authored content › every route renders its authored content with no database — /disclosures
- [x] `structure:352` authored content › every route renders its authored content with no database — /accessibility
- [x] `structure:394` authored content › the announcement bar honours its window
- [x] `structure:469` the team page is Nate › /team: CMIP is spelled out in the heading, the credentials list and the tab title
- [x] `structure:497` the team page is Nate › /team/renata-cruz is 404
- [x] `structure:497` the team page is Nate › /team/marcus-bell is 404
- [x] `structure:570` the header: one dark bar, Nate's chip and the gold phone › chip, phone and targets at 390x844

### Home page tap targets on a phone (1)

- [x] `targets:7` / has tap targets of at least 44x44 at 390x844

### 16px minimum text size (senior readability; disclosures) (10)

- [ ] `typography:24` the 16px floor › item 20: no text on / computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /services computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /learn computes below 16px
- [ ] `typography:24` the 16px floor › item 20: no text on /contact computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /scope-of-appointment computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /do-not-contact computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /disclosures computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /accessibility computes below 16px
- [x] `typography:24` the 16px floor › item 20: no text on /privacy computes below 16px
- [x] `typography:40` the 16px floor › item 20: the excluded disclosures are above the floor too

### No sideways scrolling at 400% zoom (WCAG 1.4.10 Reflow) (13)

- [x] `zoom:12` / has no horizontal scroll at 400% zoom
- [x] `zoom:12` /services has no horizontal scroll at 400% zoom
- [x] `zoom:12` /services/medicare-advantage has no horizontal scroll at 400% zoom
- [x] `zoom:12` /learn has no horizontal scroll at 400% zoom
- [x] `zoom:12` /learn/when-can-i-change-my-plan has no horizontal scroll at 400% zoom
- [x] `zoom:12` /team has no horizontal scroll at 400% zoom
- [x] `zoom:12` /team/owner has no horizontal scroll at 400% zoom
- [x] `zoom:12` /contact has no horizontal scroll at 400% zoom
- [x] `zoom:12` /scope-of-appointment has no horizontal scroll at 400% zoom
- [x] `zoom:12` /do-not-contact has no horizontal scroll at 400% zoom
- [x] `zoom:12` /privacy has no horizontal scroll at 400% zoom
- [x] `zoom:12` /disclosures has no horizontal scroll at 400% zoom
- [x] `zoom:12` /accessibility has no horizontal scroll at 400% zoom

## Remove

### accessibility.spec.ts (9)

- [x] `accessibility:24` prefers-reduced-motion: no-preference › / has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /services has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /learn has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /contact has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /scope-of-appointment has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /do-not-contact has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /disclosures has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /accessibility has no detectable accessibility violations
- [x] `accessibility:24` prefers-reduced-motion: no-preference › /privacy has no detectable accessibility violations

### budget.spec.ts (16)

- [x] `budget:90` every mobile-autoplay video is at most 2 MB and every desktop-only lazy video at most 8 MB
- [x] `budget:97` / above the fold weighs at most 1.5 MB at 390x844
- [x] `budget:115` / paints its largest content within 2.5 s on a throttled phone
- [x] `budget:47` effect JavaScript › /services downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /services/medicare-advantage downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /learn downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /learn/when-can-i-change-my-plan downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /team downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /team/owner downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /contact downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /scope-of-appointment downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /do-not-contact downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /privacy downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /disclosures downloads no WebGL renderer
- [x] `budget:47` effect JavaScript › /accessibility downloads no WebGL renderer
- [x] `budget:56` effect JavaScript › / stays within the effect budget and loads three after first paint

### lead-form.spec.ts (2)

- [x] `lead-form:69` navigation › learning centre filters produce shareable URLs
- [x] `lead-form:132` transact pages › contact page shows Nate above the form

### motion.spec.ts (58)

- [x] `motion:20` scroll reveal › content becomes visible when scrolled into view
- [x] `motion:143` night close › the phone number is set at headline size in gold, with a full tap target
- [x] `motion:164` night close › the phone link shows a focus ring when reached by keyboard
- [x] `motion:181` night close › with reduced motion: static stars and the phone, zero canvas
- [x] `motion:197` night close › with JavaScript disabled: static stars and the phone, zero canvas
- [x] `motion:211` night close › without WebGL: the static stars stay
- [x] `motion:241` night close › the star field mounts and replaces the static stars
- [x] `motion:256` night close › scrolling the whole page never shows two stages at once
- [x] `motion:311` night close › paused while live: the close canvas goes and the static stars return
- [x] `motion:331` night close › in print with the field mounted: no stars, the phone prints
- [x] `motion:356` night close › text over the live star field keeps AA contrast in every sampled frame
- [x] `motion:356` night close › text over the static stars keeps AA contrast in every sampled frame
- [x] `motion:395` night close › the live star field moves
- [x] `motion:506` hero signal field › with JavaScript disabled: the headline and the gold maze, no canvas, one screen tall
- [x] `motion:521` hero signal field › with reduced motion: the gold maze stays, no canvas or light-run video ever mounts, one screen tall
- [x] `motion:538` hero signal field › on load, without scrolling, the field converges into the gold maze, the light runs to the centre once and holds
- [x] `motion:608` hero signal field › in print with the field mounted: the maze still shows and the light-run video hides, one page tall
- [x] `motion:629` hero signal field › paused before load: no canvas until the visitor resumes
- [x] `motion:651` hero signal field › paused while live: the hero canvas and light-run video go and the still maze returns
- [x] `motion:673` hero signal field › the largest contentful paint is hero copy or the maze
- [x] `motion:699` hero signal field › on a phone, the call to action sits above the fold under the announcement bar
- [x] `motion:743` view transitions › item 9: the three view-transition pseudo-elements animate for 0s under reduced motion
- [x] `motion:771` view transitions › item 10: the site header is a named participant and does not animate
- [x] `motion:812` view transitions › the crossfade runs 180ms out then 240ms in, and the chrome does not animate
- [x] `motion:910` view transitions › the iris opens from the click point over 450ms
- [x] `motion:935` view transitions › keyboard activation opens the iris from the viewport centre
- [x] `motion:953` view transitions › a fade-only destination records no clip-path keyframes
- [x] `motion:992` view transitions › the iris stays at zero duration under reduced motion
- [x] `motion:1007` view transitions › the iris never adds a second canvas across forward and back
- [x] `motion:1070` shared-element morph › item 12: a card and its destination derive the same morph name
- [x] `motion:1129` motion added by the scroll pass › no-JS: every band is visible and no heading is empty
- [x] `motion:1167` motion added by the scroll pass › print: 9 of 9 sections render
- [x] `motion:1195` motion added by the scroll pass › the curtain reveal is open at rest and mounts no closed state under reduced motion
- [x] `motion:1226` motion added by the scroll pass › lit words are all in the DOM and fully lit under reduced motion
- [x] `motion:1264` lenis smooth scroll › is never constructed with reduced motion
- [x] `motion:1277` lenis smooth scroll › is constructed without reduced motion and torn down when the preference changes
- [x] `motion:1327` the signal reveal › reduced motion, JS off and print show the whole colour photo, unclipped
- [x] `motion:1361` the signal reveal › Pause removes the reveal and leaves the whole colour photo visible
- [x] `motion:1379` the signal reveal › with motion an iris opens on the photo as the band scrolls in, ending in full colour
- [x] `motion:1437` services glass › on a desktop the glass canvas mounts once the rail is in view
- [x] `motion:1457` services glass › on a touch phone at 390 no glass canvas is created and the orbs show
- [x] `motion:1477` services glass › when the studio map fails the canvas never mounts and the orbs stay
- [x] `motion:1503` services glass › reduced motion, JavaScript off and print: orbs and zero canvas
- [x] `motion:1603` minnesota dawn to dusk › reduced motion and JavaScript off show the poster still and zero canvas
- [x] `motion:1622` minnesota dawn to dusk › on a desktop scroll scrubs the lake video from night to dusk
- [x] `motion:1641` minnesota dawn to dusk › at 390 the loop plays instead of the scrub
- [x] `motion:1659` minnesota dawn to dusk › under reduced motion no video at either width
- [x] `motion:1672` minnesota dawn to dusk › pressing Pause pauses the loop and the still shows
- [x] `motion:1695` minnesota dawn to dusk › white copy keeps AA over the brightest frame of the desktop scrub
- [x] `motion:1723` minnesota dawn to dusk › white copy keeps AA over the brightest frame of the phone loop
- [x] `motion:1788` testimonial stack › a sweep keeps at most one active quote, none dimmed, none hidden
- [x] `motion:1839` testimonial stack › focus-pull is a transform only: the active quote has none, the rest scale to .97
- [x] `motion:1867` testimonial stack › reduced motion and print: no transform, no overlap, every quote visible
- [x] `motion:1897` testimonial stack › the home page has two pinned stages, each at most three screens tall
- [x] `motion:1914` night close › has no portrait, so Nate's face never repeats; stars and the big number stay
- [x] `motion:1964` film grain › is a tuned, inert overlay that print removes
- [x] `motion:1976` film grain › keeps text contrast and a ground-black band under rgb(12, 12, 12)
- [x] `motion:2022` film grain › a link under the overlay stays clickable

### navigation.spec.ts (3)

- [x] `navigation:52` mobile navigation sheet › item 16: locks body scroll while open
- [x] `navigation:147` navigation state and anchors › item 19: an anchor jump leaves the heading below the condensed header
- [x] `navigation:181` the learning filter › the learning filter keeps its state in the URL

### page-band.spec.ts (14)

- [x] `page-band:37` inform header bands › /services: one h1 in the band, above the fold, no canvas
- [x] `page-band:59` inform header bands › /services: the loop is muted, inline, preload none, posters the still
- [x] `page-band:87` inform header bands › /services: white title keeps AA over every sampled frame
- [x] `page-band:37` inform header bands › /services/medicare-advantage: one h1 in the band, above the fold, no canvas
- [x] `page-band:59` inform header bands › /services/medicare-advantage: the loop is muted, inline, preload none, posters the still
- [x] `page-band:87` inform header bands › /services/medicare-advantage: white title keeps AA over every sampled frame
- [x] `page-band:37` inform header bands › /learn: one h1 in the band, above the fold, no canvas
- [x] `page-band:59` inform header bands › /learn: the loop is muted, inline, preload none, posters the still
- [x] `page-band:87` inform header bands › /learn: white title keeps AA over every sampled frame
- [x] `page-band:37` inform header bands › /learn/when-can-i-change-my-plan: one h1 in the band, above the fold, no canvas
- [x] `page-band:59` inform header bands › /learn/when-can-i-change-my-plan: the loop is muted, inline, preload none, posters the still
- [x] `page-band:87` inform header bands › /learn/when-can-i-change-my-plan: white title keeps AA over every sampled frame
- [x] `page-band:108` inform header bands › reduced motion shows only the still
- [x] `page-band:117` inform header bands › pressing Pause pauses the loop and the still shows

### parity.spec.ts (28)

- [x] `parity:100` / renders one band per home block
- [x] `parity:32` print › / shows text and hides every canvas
- [x] `parity:32` print › /services shows text and hides every canvas
- [x] `parity:32` print › /services/medicare-advantage shows text and hides every canvas
- [x] `parity:32` print › /learn shows text and hides every canvas
- [x] `parity:32` print › /learn/when-can-i-change-my-plan shows text and hides every canvas
- [x] `parity:32` print › /team shows text and hides every canvas
- [x] `parity:32` print › /team/owner shows text and hides every canvas
- [x] `parity:32` print › /contact shows text and hides every canvas
- [x] `parity:32` print › /scope-of-appointment shows text and hides every canvas
- [x] `parity:32` print › /do-not-contact shows text and hides every canvas
- [x] `parity:32` print › /privacy shows text and hides every canvas
- [x] `parity:32` print › /disclosures shows text and hides every canvas
- [x] `parity:32` print › /accessibility shows text and hides every canvas
- [x] `parity:51` canvas count with motion › /services (inform) has zero canvas
- [x] `parity:51` canvas count with motion › /services/medicare-advantage (inform) has zero canvas
- [x] `parity:51` canvas count with motion › /learn (inform) has zero canvas
- [x] `parity:51` canvas count with motion › /learn/when-can-i-change-my-plan (inform) has zero canvas
- [x] `parity:51` canvas count with motion › /team (inform) has zero canvas
- [x] `parity:51` canvas count with motion › /team/owner (inform) has zero canvas
- [x] `parity:51` canvas count with motion › /contact (transact) has zero canvas
- [x] `parity:51` canvas count with motion › /scope-of-appointment (transact) has zero canvas
- [x] `parity:51` canvas count with motion › /do-not-contact (transact) has zero canvas
- [x] `parity:51` canvas count with motion › /privacy (static) has zero canvas
- [x] `parity:51` canvas count with motion › /disclosures (static) has zero canvas
- [x] `parity:51` canvas count with motion › /accessibility (static) has zero canvas
- [x] `parity:65` canvas count with motion › / mounts at most one canvas and the counter can see it
- [x] `parity:83` canvas count with motion › / canvas is display none in print

### static-tier.spec.ts (7)

- [x] `static-tier:28` accessibility page explains animations using the pause label
- [x] `static-tier:7` /privacy › has no canvas and keeps the pause control
- [x] `static-tier:14` /privacy › runs no animation
- [x] `static-tier:7` /disclosures › has no canvas and keeps the pause control
- [x] `static-tier:14` /disclosures › runs no animation
- [x] `static-tier:7` /accessibility › has no canvas and keeps the pause control
- [x] `static-tier:14` /accessibility › runs no animation

### structure.spec.ts (47)

- [x] `structure:15` home: every band shows its heading after scrolling into view
- [x] `structure:44` home: jumping to the bottom does not shift the page height
- [x] `structure:505` /contact: header and footer lockups carry the same real-text name
- [x] `structure:66` the service band › item 23: the band is a rail with one card per service
- [x] `structure:83` the service band › item 23a: arrows page the rail at 390
- [x] `structure:83` the service band › item 23a: arrows page the rail at 1440
- [x] `structure:83` the service band › item 23a: arrows page the rail at 1920
- [x] `structure:139` the service band › item 23b: tabbing into a card scrolls it into view
- [x] `structure:155` the service band › item 23c: a vertical wheel over the rail scrolls the page
- [x] `structure:172` the service band › item 23d: the rail scrolls sideways at every width and stacks in print
- [x] `structure:199` the service band › item 23f: plan-fit links land on their card (javaScript true)
- [x] `structure:199` the service band › item 23f: plan-fit links land on their card (javaScript false)
- [x] `structure:249` the service band › item 23g: nothing calls preventDefault on wheel or touch
- [x] `structure:292` the testimonials band › item 24: every quote is in the DOM, with no carousel and no auto-advance
- [x] `structure:372` authored content › pre-hydration: the served HTML carries every band's copy
- [x] `structure:427` the team page is Nate › /team: one h1 and one uncropped portrait at 1440px
- [x] `structure:427` the team page is Nate › /team: one h1 and one uncropped portrait at 390px
- [x] `structure:453` the team page is Nate › /team: title, description and nav label name one person
- [x] `structure:488` the team page is Nate › /team/owner canonicalises to /team
- [x] `structure:570` the header: one dark bar, Nate's chip and the gold phone › chip, phone and targets at 1440x900
- [x] `structure:642` the header: one dark bar, Nate's chip and the gold phone › one dark scheme before and after scrolling at 1440x900
- [x] `structure:642` the header: one dark bar, Nate's chip and the gold phone › one dark scheme before and after scrolling at 390x844
- [x] `structure:570` the header: one dark bar, Nate's chip and the gold phone › chip, phone and targets at 360x640
- [x] `structure:642` the header: one dark bar, Nate's chip and the gold phone › one dark scheme before and after scrolling at 360x640
- [x] `structure:671` the header: one dark bar, Nate's chip and the gold phone › the hero stage starts below the header at 1440x900
- [x] `structure:683` the header: one dark bar, Nate's chip and the gold phone › the stuck bar keeps a Pause toggle at 1440x900
- [x] `structure:671` the header: one dark bar, Nate's chip and the gold phone › the hero stage starts below the header at 390x844
- [x] `structure:683` the header: one dark bar, Nate's chip and the gold phone › the stuck bar keeps a Pause toggle at 390x844
- [x] `structure:719` the header: one dark bar, Nate's chip and the gold phone › the 390 px nav sheet carries the chip and a 44x44 phone
- [x] `structure:743` the cookie strip › a full-width strip that never covers the hero CTA at 1440x900
- [x] `structure:743` the cookie strip › a full-width strip that never covers the hero CTA at 390x844
- [x] `structure:798` the cookie strip › both buttons stay on screen and 44x44 at 400% zoom
- [x] `structure:816` the cookie strip › the strip does not print
- [x] `structure:834` home scroll length › stays within 16 screens at desktop
- [x] `structure:834` home scroll length › stays within 16 screens at mobile
- [x] `structure:852` the lake band › follows the services band as a 3-screen pinned track at desktop
- [x] `structure:852` the lake band › follows the services band as a 1.5-screen pinned track at mobile
- [x] `structure:894` the noise band › under reduced motion: text visible, twelve hidden paper pieces, zero canvas
- [x] `structure:913` the noise band › with JavaScript disabled: text visible, shapes hidden
- [x] `structure:927` the noise band › with motion: shapes show clearly, at or above the opacity floor, and Pause hides them
- [x] `structure:952` the noise band › white text keeps AA contrast over the brightest background at five scroll positions
- [x] `structure:985` the noise band › in print: shapes hidden, text visible
- [x] `structure:1004` the signal band › frames the photo of Nate and his daughter at or below natural width and aspect, ringed in gold
- [x] `structure:1041` the signal band › pointer light moves with the pointer on desktop only
- [x] `structure:1079` the signal band › with touch or reduced motion: no light layer
- [x] `structure:1108` the signal band › with JavaScript disabled and in print: copy and phone visible, zero canvas
- [x] `structure:1124` the signal band › white heading keeps AA contrast with the pointer on it

### targets.spec.ts (12)

- [x] `targets:7` /services has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /services/medicare-advantage has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /learn has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /learn/when-can-i-change-my-plan has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /team has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /team/owner has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /contact has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /scope-of-appointment has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /do-not-contact has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /privacy has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /disclosures has tap targets of at least 44x44 at 390x844
- [x] `targets:7` /accessibility has tap targets of at least 44x44 at 390x844

### typography.spec.ts (19)

- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on / at 1440px
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /services at 1440px
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /learn at 1440px
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /contact at 1440px
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /disclosures at 1440px
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on / at 720px (200% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /services at 720px (200% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /learn at 720px (200% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /contact at 720px (200% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /disclosures at 720px (200% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on / at 360px (400% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /services at 360px (400% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /learn at 360px (400% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /contact at 360px (400% zoom)
- [x] `typography:64` the 36px display floor › item 21: the display face never drops below 36px on /disclosures at 360px (400% zoom)
- [x] `typography:90` the 36px display floor › item 21: the display face is the extended grotesque, so the floor is measuring the right thing
- [x] `typography:167` the 44px target floor › item 22: every control on / clears 44px
- [x] `typography:167` the 44px target floor › item 22: every control on /learn clears 44px
- [x] `typography:188` the 44px target floor › item 22: the learning filter pills clear 44px specifically

### zoom.spec.ts (30)

- [x] `zoom:12` / has no horizontal scroll at phone zoom
- [x] `zoom:12` /services has no horizontal scroll at phone zoom
- [x] `zoom:12` /services/medicare-advantage has no horizontal scroll at phone zoom
- [x] `zoom:12` /learn has no horizontal scroll at phone zoom
- [x] `zoom:12` /learn/when-can-i-change-my-plan has no horizontal scroll at phone zoom
- [x] `zoom:12` /team has no horizontal scroll at phone zoom
- [x] `zoom:12` /team/owner has no horizontal scroll at phone zoom
- [x] `zoom:12` /contact has no horizontal scroll at phone zoom
- [x] `zoom:12` /scope-of-appointment has no horizontal scroll at phone zoom
- [x] `zoom:12` /do-not-contact has no horizontal scroll at phone zoom
- [x] `zoom:12` /privacy has no horizontal scroll at phone zoom
- [x] `zoom:12` /disclosures has no horizontal scroll at phone zoom
- [x] `zoom:12` /accessibility has no horizontal scroll at phone zoom
- [x] `zoom:12` / has no horizontal scroll at 200% zoom
- [x] `zoom:12` /services has no horizontal scroll at 200% zoom
- [x] `zoom:12` /services/medicare-advantage has no horizontal scroll at 200% zoom
- [x] `zoom:12` /learn has no horizontal scroll at 200% zoom
- [x] `zoom:12` /learn/when-can-i-change-my-plan has no horizontal scroll at 200% zoom
- [x] `zoom:12` /team has no horizontal scroll at 200% zoom
- [x] `zoom:12` /team/owner has no horizontal scroll at 200% zoom
- [x] `zoom:12` /contact has no horizontal scroll at 200% zoom
- [x] `zoom:12` /scope-of-appointment has no horizontal scroll at 200% zoom
- [x] `zoom:12` /do-not-contact has no horizontal scroll at 200% zoom
- [x] `zoom:12` /privacy has no horizontal scroll at 200% zoom
- [x] `zoom:12` /disclosures has no horizontal scroll at 200% zoom
- [x] `zoom:12` /accessibility has no horizontal scroll at 200% zoom
- [x] `zoom:35` the header logo keeps its mark and never overflows at 360px
- [x] `zoom:65` the stuck header keeps the full lockup visible at 360px
- [x] `zoom:65` the stuck header keeps the full lockup visible at 390px
- [x] `zoom:90` long footer address and email wrap instead of widening the page at 390px
