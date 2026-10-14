# Updates to Nate's Website

Execution plan: `docs/plans/nate-site-updates.md`.

## To do

- [ ] **Nate's bio**: add personal details
  - Plays volleyball
  - Active father with his daughter
  - Spends time with his dogs, Doyle and Mitka
  - Basketball fan
  - Family cabin in Wisconsin
- [ ] **TPMO disclaimer counts**: give the correct number of organizations and products. The disclaimer stays; the count sentence is hidden until then
- [ ] **Contact form**: send form submissions to Nate's email and save them in Postgres. The code already saves leads to Postgres and emails `LEAD_NOTIFICATION_EMAILS` through SES. Left: set `nbest@legacybenefitsmn.com` in 1Password (`lead_notification_email`), confirm the SES sender, deploy, and send one test submission
- [ ] **Home page hero**: final maze (your GIF, transparent, plays once) is PR #11; merge it
- [ ] **Logo**: Legacy Benefits Group logo from Nate's flyer in the header, footer and browser tab _(built on `feat/brand-logo`, PR pending)_
- [ ] **"8 carriers" lines**: removed the home stat, the home band numbers and the FAQ sentence _(on `feat/brand-logo`, PR pending)_
- [ ] **Nate's email**: `nbest@legacybenefitsmn.com` on the site _(on `feat/brand-logo`, PR pending)_

## Done

- [x] **NPN**: updated to 17742895
- [x] **Licensed since 2015**: shown on the home stats and the Meet Nate page
- [x] **Clients served**: 1,400+ shown on the home stats and the Meet Nate page
- [x] **Credential after Nate's name**: "Nate Best, CMIP®" with a superscript ®
- [x] **Certified Medicare Insurance Planner**: listed under Credentials & licences on the Meet Nate page, explained on hover over "CMIP"
- [x] **Carrier carousel**: Nate's carriers, with their trademark marks
  - Blue Cross® Blue Shield® MN
  - Medica®
  - HealthPartners®
  - UnitedHealthcare®
  - Allina Health® | Aetna®
  - HealthSpring℠
  - Insurance Company of North America (INA)
- [x] **Meet Nate headshot**: updated to his new photo
- [x] **Workshops**: removed from all pages
