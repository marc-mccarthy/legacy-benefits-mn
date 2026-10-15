# Updates to Nate's Website

Execution plan: `docs/plans/nate-site-updates.md`.

## To Do

- [x] **Contact form live test**: send one real submission on the live site and confirm the lead is saved and the email reaches Nate
- [ ] **Contact form bot check**: `TURNSTILE_SECRET` is empty in 1Password (`legacy-benefits-mn`), so the live form skips the Cloudflare Turnstile check. Add the secret key and redeploy

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
- [x] **Nate's bio**: about paragraphs plus an "Outside the office" list: volleyball, his daughter, his dogs Doyle and Mitka, basketball, the family cabin in Wisconsin
- [x] **Home page hero**: the gold maze from your GIF, transparent, light runs once and holds (PR #11)
- [x] **Logo**: Legacy Benefits Group logo in the header, footer and browser tab (PR #12)
- [x] **"8 carriers" lines**: removed the home stat and the FAQ sentence (PR #12)
- [x] **Nate's email**: `nbest@legacybenefitsmn.com` on the site (PR #12)
- [x] **Contact form email**: leads email `nbest@legacybenefitsmn.com` through SES and are saved in Postgres. Subject "Legacy Benefits Group - New Lead: {name}", every form field plus consent, reply goes to the customer (PRs #13, #15; tested locally)
- [x] **Home page photo**: the photo of Nate with his daughter stays
- [ ] **Remove uneeded Terraform**: check to see if in the current UI, are all the Terraform resources we have in IaC needed? If not, we need to remove
