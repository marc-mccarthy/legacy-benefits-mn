# Diagram sources

Every diagram in this atlas, one fence each, in `LEGEND` then `D1` through `D8` order.
Each fence is byte-identical to the `.mmd` file beside it.

This file is generated. Run `pnpm diagrams:build` to rewrite it; never edit it by hand.

<details>
<summary>The key — shapes, colours and line styles</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: What every shape, colour and line style in this atlas means
accDescr {
  The key to the other seven figures. Colour carries who owns a thing: indigo for
  a person, blue for something in the visitor's browser or at the edge, green for
  code this repository owns and runs, amber for a check that is allowed to reject,
  grey for a third party, red for regulated data under the ten-year retention
  obligation, violet for a stored artifact such as a secret, a setting or a
  bucket. Shape carries what kind of thing it is: a rounded stadium is a person, a
  rectangle is a process or a component, a hexagon is a gate, a double rectangle
  is a function or a document that runs, a cylinder is stored data, and a
  parallelogram is a scheduled or external trigger. Line style carries what
  happens: a plain arrow is normal flow, a thick arrow is the answer coming back,
  a crossed arrow is a path that is refused or deliberately absent, and a dotted
  arrow is something that happens out of band rather than during the request. A
  red line is drawn wherever the thing being refused is the point of the figure.
}

subgraph colours ["Colour: who owns it"]
  cHuman([A person])
  cClient[Browser or edge]
  cOurs[Code this repository runs]
  cGuard{{A check that can reject}}
  cVendor[A third party]
  cPhi[("Regulated data, ten-year retention")]
  cArtifact[("A stored secret, setting or bucket")]
end

subgraph shapes ["Shape: what kind of thing"]
  sPerson([Stadium: a person])
  sProcess[Rectangle: a process or component]
  sGate{{Hexagon: a gate}}
  sContainer[[Double rectangle: a function or running document]]
  sStore[("Cylinder: stored data")]
  sTrigger[/"Parallelogram: a scheduled or external trigger"/]
end

subgraph lines ["Line: what happens"]
  lFromA[Normal control flow]
  lToA[Continues]
  lFromB[The answer coming back]
  lToB[Reaches the caller]
  lFromC[A path that is refused or absent]
  lToC[Never happens]
  lFromD[Out of band, not during the request]
  lToD[Happens later]
end

lFromA --> lToA
lFromB ==> lToB
lFromC --x lToC
lFromD -.-> lToD

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class cHuman,sPerson human
class cClient client
class cOurs,sProcess,sContainer,sTrigger ours
class cGuard,sGate guard
class cVendor vendor
class cPhi phi
class cArtifact,sStore artifact
linkStyle 2 stroke:#B91C1C,stroke-width:3px
```

</details>

<details>
<summary>D1 — how a visitor reaches the site</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: How a visitor reaches the site and where their answer comes from
accDescr {
  A top-to-bottom map of one visit. Someone looking for Medicare help opens the
  site in a browser. The name resolves through Route 53 to CloudFront, which is the
  only way in. A viewer-request function redirects www to the apex host and maps a
  path such as /services to /services.html. Pages, /_next/static, /media and /video
  are read from a private S3 bucket; /api/* goes to the API Lambda function URL
  with caching disabled. Both origins sit behind origin access control: requests are
  signed with SigV4, the bucket policy admits only this distribution, and the
  function URL uses AWS_IAM authorization, so neither can be called directly. The
  API Lambda runs in private subnets and talks to Aurora PostgreSQL Serverless v2,
  whose security group admits only the Lambda's security group on 5432. It writes
  lead, Scope of Appointment and do-not-contact records there. Two outbound
  dependencies sit to the side: Cloudflare Turnstile verifies that a form submitter
  is human, and SES sends the acknowledgement and the agency notification when a
  sender address is configured. The MedicarePRO CRM is never called during the
  visitor's request. The job route that would deliver to it needs a bearer token
  and nothing in infra/ schedules a caller. It reaches the CRM through the relay
  only when CRM_TRANSPORT=relay, and otherwise sends nothing. The Lambda's environment, including
  the database password, the PAYLOAD_SECRET salt and the job token, is generated and
  set by Terraform and never reaches the browser.
}

visitor([Someone looking for Medicare help])
browser[Browser]
dns[Route 53 alias records]
edge{{CloudFront}}
rewrite["Viewer-request function: www to apex, path to .html"]
oac{{"Origin access control: SigV4, private bucket, function URL AWS_IAM"}}
bucket[("S3 assets bucket: pages, static files, media, video")]
api[["API Lambda, src/api, in private subnets"]]
jobRoute["/api/jobs/outbox, bearer token"]
db[("Aurora PostgreSQL Serverless v2")]
turnstile{{Cloudflare Turnstile}}
ses[Amazon SES]
crm[MedicarePRO CRM]
trigger[/"Scheduled caller of the job route, none defined in infra/"/]
lambdaEnv[("Lambda environment set by Terraform")]

visitor -->|opens the site| browser
browser -->|resolves the name| dns
dns -->|A and AAAA alias| edge
browser -->|HTTPS| edge
edge -->|pages| rewrite
rewrite -->|signed request| oac
edge -->|/api/*, /_next/static, /media, /video| oac
oac -->|static files| bucket
oac -->|API calls| api
oac --x|any other caller| browser
api -->|leads, consent, suppression, outbox| db
api -->|is this a human| turnstile
turnstile --x|verification failed| browser
api -->|acknowledgement and notification| ses
api -->|routes by path| jobRoute
trigger --x|no schedule exists| jobRoute
jobRoute -->|claims due rows| db
jobRoute --x|relay called only when CRM_TRANSPORT=relay| crm
lambdaEnv -.->|set at deploy| api
lambdaEnv --x|never reaches the browser| browser

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class visitor human
class browser client
class edge,oac,turnstile guard
class rewrite,api,jobRoute,trigger ours
class db phi
class bucket,lambdaEnv artifact
class dns,ses,crm vendor
linkStyle 9,12,15,17,19 stroke:#B91C1C,stroke-width:3px
```

</details>

<details>
<summary>D2 — a content module to a rendered page</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: How an authored content module becomes a rendered page
accDescr {
  A top-to-bottom map of one page render. Content is authored as TypeScript
  modules under src/content. At build time the route's server component imports
  the modules it needs, resolves the business identity from the environment, and
  gathers the collections into a single data bundle. The environment at build time
  comes from app.env through op run. The home page's block list comes from home.ts.
  The renderer switches on each block's type and returns the matching section
  component; twelve block types are handled and the home page uses eleven of them.
  An unknown type renders nothing. Because next.config sets output export, every
  route is rendered once during the build into out/ and the deploy workflow syncs
  it to S3, where CloudFront serves it as static files. No request reaches a
  database, and there is no runtime content fetch to cache.
}

author([Author])
contentModules[("src/content/*.ts")]
homeBlocks[("home.ts, the block list")]
env[/"BUSINESS_NAME and friends, from app.env at build"/]
build["next build, output: export"]
route["Server component for the route"]
identity["getBusinessIdentity"]
blockData[/"One data bundle"/]
renderBlocks{{"RenderBlocks, switch on blockType"}}
sections["Twelve section components"]
out[("out/, static HTML")]
visitor([Visitor])
cdn["CloudFront and S3"]
html[Rendered page]

author -->|edits| contentModules
contentModules -->|includes| homeBlocks
build -->|renders every route| route
route -->|imports| contentModules
route -->|calls| identity
env -->|read by| identity
identity -->|name, phone, address| blockData
contentModules -->|gathered into| blockData
homeBlocks -->|layout| renderBlocks
blockData -->|passed whole| renderBlocks
renderBlocks -->|one per block| sections
sections ==>|written to| out
out -->|aws s3 sync, then invalidate| cdn
visitor -->|requests a route| cdn
cdn ==>|serves| html
identity --x|BUSINESS_NAME unset| build

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class author,visitor human
class cdn,html client
class build,route,identity,sections ours
class renderBlocks guard
class contentModules,homeBlocks,env,blockData,out artifact
```

</details>

<details>
<summary>D3 — a form submission, click to CRM</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
sequenceDiagram
accTitle: What happens to a contact form submission, from the click to the CRM
accDescr {
  A left-to-right sequence for one lead. The form posts JSON to the lead route.
  The route rejects unparseable bodies, then rejects a body that fails the schema.
  It reads the client address from the first hop of the forwarded-for header. A
  filled honeypot field is accepted with a success status and nothing is stored,
  so a bot learns nothing from the response. Turnstile is asked whether the
  submitter is human and a failure is rejected; when no Turnstile secret is
  configured the check is skipped. The business identity is read from
  the environment, because the consent text has to name the specific business, and
  a missing BUSINESS_NAME throws rather than resolving to a default. The
  capture step checks the suppression list first, then opens one transaction: the
  lead row is inserted with the consent text regenerated on the server, the
  disclosure version, a hashed address and a retention date ten years out. Only if
  the person is not suppressed is an outbox row inserted in that same transaction.
  Email is best effort and its failures are swallowed, because the lead is already
  committed; it is skipped when no sender address is configured. The visitor gets a
  created response either way, and its body carries the lead id and a suppressed
  flag. Delivery happens later and off the request: a caller posts to the job route
  with the bearer token, and the route claims due rows and sends them to the CRM
  transport. Nothing in infra/ schedules that call, and the deployed function sets
  the transport to mock.
}

participant V as Visitor
participant R as Lead route
participant T as Turnstile
participant S as Suppression list
participant DB as Aurora PostgreSQL
participant M as SES
participant J as Outbox drain
participant C as CRM transport

V->>R: POST the form as JSON
alt body will not parse
  R-->>V: 400 Invalid JSON
end
alt schema rejects a field
  R-->>V: 422 with field errors
end
R->>R: read client address from first forwarded hop
alt honeypot field was filled
  R-->>V: 202, nothing stored
end
R->>T: is this submitter human
alt not verified
  T-->>R: no
  R-->>V: 403 could not verify
end
T-->>R: yes
R->>R: read business identity from the environment
R->>S: has this email or phone opted out
S-->>R: suppressed, yes or no
Note over R,DB: one transaction
R->>DB: insert lead with consent text, version, hashed address, retention date
alt not suppressed
  R->>DB: insert outbox row with idempotency key
end
DB-->>R: lead id
R->>M: notify the agency, in parallel with the acknowledgement
alt not suppressed
  R->>M: acknowledge the visitor
end
Note over R,M: failures never reach the visitor
R-->>V: 201 with the lead id and a suppressed flag
Note over J,C: later, off the visitor's request, when the job route is called
J->>J: check the bearer token
J->>DB: claim due rows, skip locked, lease five minutes
DB-->>J: up to 25 rows
J->>C: send with the idempotency key, transport is mock when deployed
alt delivered
  C-->>J: ok
  J->>DB: mark sent
else retryable
  C-->>J: error
  J->>DB: back off and try again
else gave up
  J->>DB: mark failed for a human, after 8 attempts or a fatal error
end
```

</details>

<details>
<summary>D4 — the four regulated tables</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: The four regulated tables, what each one proves, and what links them
accDescr {
  The four tables the lead pipeline owns, which are the only tables in the
  database. They are defined in src/lib/db/schema.ts, drizzle-kit is filtered to
  those four, and the migrate Lambda applies the generated migrations on deploy.
  Leads carry the TCPA consent evidence: the exact disclosure text
  shown, its version, and the moment of agreement, because a boolean is not
  evidence. Scope of Appointment records carry a signature, a signing time, the
  product types agreed to and the attestation text with its version. Do-not-contact
  requests carry an email and a phone reduced to its last ten digits, which is the
  canonical form the suppression lookup uses; they are indexed on both. The outbox
  references a lead and is deleted with it, and its idempotency key is unique so a
  retry cannot create a second contact in the CRM. Three of the four carry a hashed
  address salted with the application secret, which is why rotating that secret
  severs every hash at once. Leads and Scope of Appointment records carry a
  retention date ten years out; suppression rows carry none, because a suppression
  has to outlive the record it suppresses.
}

subgraph regulated ["Defined in src/lib/db/schema.ts, managed by drizzle-kit"]
  leads[("leads")]
  soa[("soa_submissions")]
  dnc[("dnc_requests")]
  outbox[("crm_outbox")]
end

leadsCols["consent_text, consent_version, consented_at
ip_hash, user_agent, utm, source_path
retention_until, ten years out"]
soaCols["product_types, signature, signed_at
appointment_at, attestation_text and version
ip_hash, retention_until, not null"]
dncCols["email lowercased, phone last ten digits
request_type, handled_at, ip_hash
indexed on email and on phone"]
outboxCols["lead_id, idempotency_key unique
payload, status, attempts
next_attempt_at, last_error, sent_at"]

secret[("PAYLOAD_SECRET, the ip_hash salt, generated by Terraform when deployed")]
capture{{"captureLead"}}
suppression{{"isSuppressed"}}
drain{{"drainOutbox"}}
crm[MedicarePRO CRM]

leads --- leadsCols
soa --- soaCols
dnc --- dncCols
outbox --- outboxCols

capture -->|inserts, one transaction| leads
capture -->|inserts, same transaction| outbox
capture -->|asks first| suppression
suppression -->|matches on email or digits| dnc
suppression --x|suppressed, so no outbox row| outbox
outbox -->|lead_id, deleted with its lead| leads
drain -->|claims due rows| outbox
drain -->|idempotency key prevents a duplicate| crm

secret -.->|salts| leads
secret -.->|salts| soa
secret -.->|salts| dnc


classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class leads,soa,dnc,outbox phi
class leadsCols,soaCols,dncCols,outboxCols,secret artifact
class capture,drain ours
class suppression guard
class crm vendor
linkStyle 8 stroke:#B91C1C,stroke-width:3px
```

</details>

<details>
<summary>D5 — every server module and its imports</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart LR
accTitle: Every server module this repository owns, and what each one imports
accDescr {
  A left-to-right map of the server side of the application, derived from the imports in the
  code rather than drawn by hand, so it cannot describe a wiring that no longer exists. Each
  box is one module; each arrow is one module importing another. Route handlers sit on the
  left, since every request enters through one of them. The two modules that verify a request
  and the one that decides whether a person may be contacted are drawn as gates, because their
  job is to reject. The database schema is drawn as regulated data, because that is what it
  declares. Test files are excluded: a test importing a module says nothing about how the
  application is wired. 41 modules and 56 imports are drawn.
}

subgraph Routehandlers ["Route handlers"]
  apiRouter["index.ts"]
  leadsRoute["leads.ts"]
  soaRoute["soa.ts"]
  dncRoute["do-not-contact.ts"]
  jobsRoute["jobs-outbox.ts"]
  healthRoute["health.ts"]
end

subgraph Requestsafety ["Request safety"]
  turnstile["security/turnstile.ts"]
  request["security/request.ts"]
end

subgraph Leadpipeline ["Lead pipeline"]
  leadService["leads/service.ts"]
  leadSchema["leads/schema.ts"]
  outbox["leads/outbox.ts"]
  interestLabels["leads/interest-labels.ts"]
  phoneFormat["phone-format.ts"]
end

subgraph Compliance ["Compliance"]
  disclosures["compliance/disclosures.ts"]
  suppression["compliance/suppression.ts"]
  phone["compliance/phone.ts"]
  dnc["compliance/dnc.ts"]
  dncSchema["compliance/dnc-schema.ts"]
  soa["compliance/soa.ts"]
  soaSchema["compliance/soa-schema.ts"]
end

subgraph CRMdelivery ["CRM delivery"]
  crm["crm/index.ts"]
  crmTypes["crm/types.ts"]
  relay["crm/transports/relay.ts"]
  mock["crm/transports/mock.ts"]
end

subgraph Storageandcontent ["Storage and content"]
  db["db/index.ts"]
  dbSchema["db/schema.ts"]
  media["media.ts"]
  imageLoader["image-loader.ts"]
end

subgraph Outboundandconfiguration ["Outbound and configuration"]
  email["email/index.ts"]
  env["env.ts"]
  siteUrl["site-url.ts"]
  postJson["post-json.ts"]
  business["business.ts"]
  announcement["announcement.ts"]
  motion["motion.ts"]
  effectsPause["effects-pause.ts"]
  webglRegistry["webgl-registry.ts"]
  portraitPoints["portrait-points.ts"]
  signalField["signal-field.ts"]
  random["random.ts"]
  utils["utils.ts"]
end

apiRouter --> dncRoute
apiRouter --> healthRoute
apiRouter --> jobsRoute
apiRouter --> leadsRoute
apiRouter --> soaRoute
business --> env
crm --> crmTypes
crm --> env
crm --> mock
crm --> relay
db --> dbSchema
dnc --> db
dnc --> dncSchema
dnc --> leadSchema
dnc --> leadService
dnc --> suppression
dncRoute --> dnc
dncRoute --> dncSchema
dncRoute --> request
dncSchema --> phone
email --> disclosures
email --> interestLabels
healthRoute --> db
jobsRoute --> env
jobsRoute --> outbox
leadService --> db
leadService --> disclosures
leadService --> leadSchema
leadService --> suppression
leadsRoute --> business
leadsRoute --> email
leadsRoute --> leadSchema
leadsRoute --> leadService
leadsRoute --> request
leadsRoute --> turnstile
mock --> crmTypes
outbox --> crm
outbox --> db
portraitPoints --> random
relay --> crmTypes
signalField --> motion
signalField --> random
siteUrl --> env
soa --> db
soa --> disclosures
soa --> leadSchema
soa --> leadService
soa --> soaSchema
soaRoute --> request
soaRoute --> soa
soaRoute --> soaSchema
soaRoute --> turnstile
soaSchema --> disclosures
suppression --> db
suppression --> phone
turnstile --> env

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class apiRouter,leadsRoute,soaRoute,dncRoute,jobsRoute,healthRoute,leadService,leadSchema,outbox,interestLabels,phoneFormat,disclosures,phone,dnc,dncSchema,soa,soaSchema,crm,crmTypes,postJson,effectsPause,webglRegistry,portraitPoints,signalField,random,utils ours
class turnstile,request,suppression guard
class relay,mock,email vendor
class dbSchema phi
class db,media,imageLoader,env,siteUrl,business,announcement,motion artifact
```

</details>

<details>
<summary>D7 — push to serving release</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: What runs between a pull request, a merge to main and the new release serving
accDescr {
  Two things happen at different times. On a pull request the CI workflow runs two
  jobs, each against a throwaway Postgres 17 service. Quality applies the migrations
  with drizzle-kit migrate and then lints, checks formatting, type checks, checks
  that the diagrams match their sources, tests the app.env guard script and runs the
  unit tests with coverage and the integration tests. The end-to-end job applies the
  migrations, builds the site and the API bundle and runs the Playwright suite, which
  includes the accessibility and compliance specs. When a pull request touches
  infra/, the Terraform workflow also checks formatting, runs the plan guard test,
  validates the stack without a backend, runs tflint and scans for misconfiguration
  with Trivy. A push to main, or a manual run naming a commit, starts the deploy
  workflow, which does not wait for those checks and does not repeat them. Its build
  job runs on an arm64 runner, matching the Lambda architecture. It refuses a commit
  that is not an ancestor of main, builds the static site with the environment read
  from app.env through op run, bundles src/api with esbuild into the API package, and
  packs a second package for the migrate function. The terraform job assumes a role
  over OIDC rather than using stored keys, plans with the variables from app.env, and
  a plan guard fails the run if the plan deletes or replaces anything outside the
  allowlist; only then does it apply. The deploy job first checks that the site URL
  it built with equals the one Terraform applied, assumes a second OIDC role, and
  uploads both packages to the releases prefix of the assets bucket. It updates and
  invokes the migrate Lambda, which runs the drizzle migrator, and a migration
  failure stops the run before the API function is touched. It then updates the API
  function, syncs the static site, media and video to S3, and invalidates the edge.
  Last it polls the health route until it answers 200, fetches the home page and
  requires the business name in it, and sends a signed POST to the do-not-contact
  route that must be rejected with 400 or 422. Nothing is rolled back when a later
  step fails.
}

pr([Pull request])
merge([Push to main, or a manual run naming a commit])

subgraph ci ["CI workflow, on a pull request"]
  quality["Quality job: drizzle-kit migrate, lint, format, types, diagrams, unit, integration"]
  e2eJob["End-to-end job: migrate, build, API bundle, Playwright"]
end

subgraph tfPr ["Terraform workflow, when infra/ changes"]
  tfChecks["Format, plan guard test, validate, tflint, Trivy"]
end

subgraph build ["Deploy workflow, build job, arm64 runner"]
  ancestor{{"Commit must be an ancestor of main"}}
  siteBuild["Build the static site, environment from app.env through op run"]
  packApi["Bundle src/api with esbuild, size guard, zip"]
  packMigrate["Pack the migrate function: drizzle-orm, pg, migrations"]
end

subgraph tf ["Deploy workflow, terraform job"]
  oidcTf{{"Assume the terraform role over OIDC"}}
  plan["terraform plan, variables from app.env"]
  planGuard{{"Plan guard: deletes only from the allowlist"}}
  apply["terraform apply"]
end

subgraph rel ["Deploy workflow, deploy job, arm64 runner"]
  urlCheck{{"Built site URL equals applied site URL"}}
  oidcDeploy{{"Assume the deploy role over OIDC"}}
  upload["Upload both packages to S3 releases/"]
  migrateRun{{"Update and invoke the migrate Lambda"}}
  updateFn["Update the API function code"]
  syncSite["Sync the static site, media and video to S3"]
  invalidate["Invalidate the edge"]
  healthProbe{{"Poll /api/health until 200"}}
  pageProbe{{"Fetch the home page, require the business name"}}
  postProbe{{"Signed POST to /api/do-not-contact answers 400 or 422"}}
end

serving([New release serving])
stop([Run fails, nothing is rolled back])

pr --> quality
pr --> e2eJob
pr --> tfChecks
merge --> ancestor
ancestor --x|not an ancestor| stop
ancestor --> siteBuild
siteBuild --> packApi
packApi --> packMigrate
packMigrate --> oidcTf
oidcTf --> plan
plan --> planGuard
planGuard --x|deletes outside the allowlist| stop
planGuard --> apply
apply --> urlCheck
urlCheck --x|URLs differ| stop
urlCheck --> oidcDeploy
oidcDeploy --> upload
upload --> migrateRun
migrateRun --x|a migration failed| stop
migrateRun --> updateFn
updateFn --> syncSite
syncSite --> invalidate
invalidate --> healthProbe
healthProbe --x|never 200| stop
healthProbe --> pageProbe
pageProbe --x|not 200 or name missing| stop
pageProbe --> postProbe
postProbe --x|any other status| stop
postProbe --> serving

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class pr,merge,serving human
class stop phi
class quality,e2eJob,tfChecks,siteBuild,packApi,packMigrate,plan,apply,upload,updateFn,syncSite,invalidate ours
class ancestor,oidcTf,planGuard,urlCheck,oidcDeploy,migrateRun,healthProbe,pageProbe,postProbe guard
linkStyle 4,11,14,18,23,25,27 stroke:#B91C1C,stroke-width:3px
```

</details>

<details>
<summary>D8 — a stop request, taken and enforced</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: How a stop request is taken, stored, and enforced on every later submission
accDescr {
  Two paths that meet at one table. On the left, someone asks not to be contacted.
  The opt-out route deliberately has no Turnstile and no identity check: under
  TCPA a revocation must be honoured through any reasonable means, and friction on
  a stop request is itself the risk. The request is validated, the email is
  lowercased and the phone is reduced to its last ten digits, and the row is
  written with a hashed address. That reduction is the one canonical form, in
  lib/compliance/phone.ts and shared by the validation schema, the write and the
  lookup, because storage and lookup once had separate versions of it and a number
  written differently stayed contactable; a data migration rewrote the older rows
  into that form. The request reaches the Lambda through CloudFront like any other
  API call. On the
  right, a later contact form submission is captured. Before anything is queued,
  the suppression check matches the submitted email or the submitted digits
  against that table. A match does not discard the submission: the person did fill
  in the form, so the lead is still stored as a record. What a match stops is the
  outbox row, so nothing is delivered to the CRM, and it stops the acknowledgement
  email; the agency notification is still sent. The visitor still receives a 201
  and the form shows the same success message either way. The JSON body does carry
  a suppressed flag, which the form ignores. No code releases a suppressed lead or
  sets handled_at on a request: both are done by hand. A suppression row carries no
  retention date, because it has to outlive the lead it suppresses.
}

person([Someone revoking consent])
optOutForm["Do-not-contact form"]
optOutRoute["/api/do-not-contact"]
noTurnstile{{"No Turnstile, no identity check, by design"}}
validateDnc{{"Validate the request"}}
canonical["Lowercase the email, keep the last ten digits"]
dncTable[("dnc_requests")]
handled["A human actions it in the CRM and sets handled_at"]

visitor([A later visitor])
leadForm["Contact form"]
leadRoute["/api/leads"]
capture["captureLead"]
suppressionCheck{{"isSuppressed: match email or digits"}}
leadsTable[("leads")]
outboxTable[("crm_outbox")]
confirmEmail["Acknowledgement email"]
response["201 either way, the form shows the same message"]
drain["Outbox drain"]
crm[MedicarePRO CRM]
release["Release by hand, a human decision"]

person --> optOutForm
optOutForm --> optOutRoute
optOutRoute --> noTurnstile
noTurnstile --> validateDnc
validateDnc --x|fails the schema| optOutForm
validateDnc --> canonical
canonical -->|insert with a hashed address| dncTable
dncTable -.->|later| handled

visitor --> leadForm
leadForm --> leadRoute
leadRoute --> capture
capture --> suppressionCheck
suppressionCheck -->|reads| dncTable
capture -->|always stored| leadsTable
suppressionCheck -->|not suppressed| outboxTable
suppressionCheck --x|suppressed, no outbox row| outboxTable
suppressionCheck --x|suppressed, no acknowledgement| confirmEmail
capture --> response
outboxTable --> drain
drain --> crm
leadsTable -.->|suppressed rows wait here| release
release -.-> crm

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class person,visitor,handled,release human
class optOutForm,leadForm,response,confirmEmail client
class optOutRoute,leadRoute,capture,canonical,drain ours
class noTurnstile,validateDnc,suppressionCheck guard
class dncTable,leadsTable,outboxTable phi
class crm vendor
linkStyle 4,15,16 stroke:#B91C1C,stroke-width:3px
```

</details>
