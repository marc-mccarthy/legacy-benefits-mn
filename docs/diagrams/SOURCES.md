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
  The key to the other eight figures. Colour carries who owns a thing: indigo for
  a person, blue for something in the visitor's browser or at the edge, green for
  code this repository owns and runs, amber for a check that is allowed to reject,
  grey for a third party, red for regulated data under the ten-year retention
  obligation, violet for a stored artifact such as a secret, a parameter or a
  bucket. Shape carries what kind of thing it is: a rounded stadium is a person, a
  rectangle is a process or a component, a hexagon is a gate, a double rectangle
  is a container or a document that runs, a cylinder is stored data, and a
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
  cArtifact[("A stored secret, parameter or bucket")]
end

subgraph shapes ["Shape: what kind of thing"]
  sPerson([Stadium: a person])
  sProcess[Rectangle: a process or component]
  sGate{{Hexagon: a gate}}
  sContainer[[Double rectangle: a container or running document]]
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
  site in a browser. The request arrives at CloudFront, which is the only way in:
  the instance security group admits CloudFront's managed prefix list and nothing
  else, so the public address cannot be dialled directly. CloudFront forwards to
  Caddy on the single instance, which terminates origin TLS using a certificate it
  renews over DNS-01, and proxies inward to the Next.js application container.
  The application renders content authored in src/content and writes lead, Scope
  of Appointment and do-not-contact records to the Postgres container, whose
  data directory is a bind mount on a separate EBS volume that outlives the
  instance. Images are served from an S3 bucket. Three outbound dependencies sit
  to the side: Cloudflare Turnstile verifies that a form submitter is human, SES
  sends the acknowledgement and the agency notification, and the MedicarePRO CRM
  receives leads. The CRM is never called during the visitor's request; a host
  timer posts to a local job route once a minute and that is what delivers. Every
  secret the application needs is rendered from SSM Parameter Store into a file on
  the box at boot, and none of it is reachable from the browser.
}

visitor([Someone looking for Medicare help])
browser[Browser]
edge{{CloudFront}}
originSg{{"Security group: CloudFront prefix list only"}}
caddy[["Caddy, origin TLS"]]
app["Next.js 16, static export"]
postgres[("Postgres container")]
ebs[("EBS data volume")]
mediaBucket[("S3 media bucket")]
turnstile{{Cloudflare Turnstile}}
ses[Amazon SES]
crm[MedicarePRO CRM]
timer[/"systemd timer, every minute"/]
jobRoute["/api/jobs/outbox"]
ssm[("SSM Parameter Store")]
appEnv[("/etc/legacybenefitsmn/app.env")]

visitor -->|opens the site| browser
browser -->|HTTPS| edge
edge -->|the only admitted source| originSg
originSg -->|port 443| caddy
originSg --x|any other source| browser
caddy -->|proxies to app:3000| app
app -->|content, leads, consent| postgres
postgres -->|data directory is a bind mount| ebs
app -->|images and uploads| mediaBucket
app -->|is this a human| turnstile
turnstile --x|verification failed| browser
app -->|acknowledgement and notification| ses
timer -->|POST with bearer token| jobRoute
jobRoute -->|claims due rows| postgres
jobRoute -->|delivers queued leads| crm
ssm -.->|rendered at boot| appEnv
appEnv -.->|read by the container| app
appEnv --x|never reaches the browser| browser

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class visitor human
class browser client
class edge,originSg,turnstile guard
class caddy,app,jobRoute,timer ours
class postgres,ebs phi
class mediaBucket,ssm,appEnv artifact
class ses,crm vendor
linkStyle 4,10,17 stroke:#B91C1C,stroke-width:3px
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
  gathers the collections into a single data bundle. The home page's block list
  comes from home.ts. The renderer switches on each block's type and returns the
  matching section component; ten block types are defined and all ten are
  handled. Because next.config sets output export, every route is rendered once
  during the build into out/ and deployed as static files — no request reaches a
  database, and there is no runtime content fetch to cache.
}

author([Author])
contentModules[("src/content/*.ts")]
homeBlocks[("home.ts, the block list")]
env[/"BUSINESS_NAME and friends"/]
build["next build, output: export"]
route["Server component for the route"]
identity["getBusinessIdentity"]
blockData[/"One data bundle"/]
renderBlocks{{"RenderBlocks, switch on blockType"}}
sections["Ten section components"]
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
out -->|synced by deploy| cdn
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
  submitter is human and a failure is rejected. The business identity is read from
  the environment, because the consent text has to name the specific business, and
  a missing BUSINESS_NAME throws rather than resolving to a default. The
  capture step checks the suppression list first, then opens one transaction: the
  lead row is inserted with the consent text regenerated on the server, the
  disclosure version, a hashed address and a retention date ten years out. Only if
  the person is not suppressed is an outbox row inserted in that same transaction.
  Email is best effort and its failures are swallowed, because the lead is already
  committed. The visitor gets a created response either way. Delivery happens
  later: a host timer posts to the job route once a minute, which claims due rows
  and sends them to the CRM.
}

participant V as Visitor
participant R as Lead route
participant T as Turnstile
participant S as Suppression list
participant DB as Postgres
participant M as SES
participant J as Outbox drain
participant C as MedicarePRO

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
R->>M: notify the agency
alt not suppressed
  R->>M: acknowledge the visitor
end
Note over R,M: failures are logged, never returned
R-->>V: 201 with the lead id
Note over J,C: a minute later, off the visitor's request
J->>DB: claim due rows, skip locked
DB-->>J: up to 25 rows
J->>C: send with the idempotency key
alt delivered
  C-->>J: ok
  J->>DB: mark sent
else retryable
  C-->>J: error
  J->>DB: back off and try again
else gave up
  J->>DB: mark failed for a human
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
  database; drizzle-kit owns all four. Leads carry the TCPA consent evidence: the exact disclosure text
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

subgraph regulated ["Owned by drizzle-kit, ten-year retention"]
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

secret[("PAYLOAD_SECRET, the ip_hash salt")]
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
  application is wired. 38 modules and 54 imports are drawn.
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
  webhook["crm/transports/webhook.ts"]
  zapier["crm/transports/zapier.ts"]
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
  business["business.ts"]
  announcement["announcement.ts"]
  motion["motion.ts"]
  effectsPause["effects-pause.ts"]
  webglRegistry["webgl-registry.ts"]
  portraitPoints["portrait-points.ts"]
  signalField["signal-field.ts"]
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
crm --> webhook
crm --> zapier
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
signalField --> portraitPoints
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
webhook --> crmTypes
zapier --> crmTypes

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class apiRouter,leadsRoute,soaRoute,dncRoute,jobsRoute,healthRoute,leadService,leadSchema,outbox,disclosures,phone,dnc,dncSchema,soa,soaSchema,crm,crmTypes,effectsPause,webglRegistry,portraitPoints,signalField,utils ours
class turnstile,request,suppression guard
class webhook,zapier,mock,email vendor
class dbSchema phi
class db,media,imageLoader,env,siteUrl,business,announcement,motion artifact
```

</details>

<details>
<summary>D7 — push to serving release</summary>

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Helvetica Neue, Helvetica, Arial, sans-serif","fontSize":"16px","textColor":"#0F172A","background":"#FFFFFF","lineColor":"#475569","mainBkg":"#EFF6FF","nodeBorder":"#1D4ED8","primaryColor":"#EFF6FF","primaryBorderColor":"#1D4ED8","primaryTextColor":"#0F172A","secondaryColor":"#F1F5F9","secondaryBorderColor":"#475569","secondaryTextColor":"#0F172A","tertiaryColor":"#F8FAFC","tertiaryBorderColor":"#CBD5E1","tertiaryTextColor":"#0F172A","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","actorBkg":"#EEF2FF","actorBorder":"#4338CA","actorTextColor":"#0F172A","signalColor":"#475569","signalTextColor":"#0F172A","noteBkgColor":"#FEF3C7","noteBorderColor":"#B45309","noteTextColor":"#0F172A","activationBkgColor":"#ECFDF5","activationBorderColor":"#047857","labelBoxBkgColor":"#FEF3C7","labelBoxBorderColor":"#B45309","sequenceNumberColor":"#FFFFFF"},"flowchart":{"htmlLabels":false,"curve":"basis","nodeSpacing":45,"rankSpacing":60,"padding":12},"sequence":{"useMaxWidth":false,"htmlLabels":false,"mirrorActors":false,"wrap":true,"width":190}}}%%
flowchart TB
accTitle: What runs between a push and the new release serving
accDescr {
  A push to main starts two workflows. The checks workflow runs three jobs against
  a throwaway Postgres: quality applies the migrations and then lints, checks
  formatting, type checks and runs unit and integration tests; the end-to-end job
  applies the migrations and runs the Playwright suite, whose
  accessibility and compliance specs are release gates; the Terraform job checks
  formatting and validates the stack. The deploy workflow runs on a native arm64
  runner because the instance is Graviton. It assumes a role over OIDC rather than
  using stored keys, builds and pushes the runtime image, then builds and pushes a
  second image from the same commit's migrate stage, which is a cache hit because
  the runtime build already exported the shared layers. It then sends one Systems
  Manager command carrying those two image references. On the box the deploy script
  pulls first so a failure changes nothing, brings Postgres up and waits for it to
  be healthy, runs the migrate container once, and only then brings the application
  up and waits on its health check. It probes the health route and then fetches a
  real page, because the health route runs one query and never renders React.
  Nothing downstream runs unless that command succeeded: the edge is invalidated
  only afterwards, and the last step fetches the health route through the public
  site URL.
}

push([Push to main])

subgraph checks ["Checks workflow"]
  quality["Quality job: both migrators, lint, format, types, unit, integration"]
  e2eJob["End-to-end job: both migrators, seed, Playwright"]
  tfJob["Terraform job: format check, init, validate"]
end

subgraph build ["Deploy workflow, arm64 runner"]
  oidc{{"Assume role over OIDC"}}
  runtimeImage["Build and push the runtime image"]
  migrateImage["Build and push the migrate image, same commit"]
  sendCommand[["Send one Systems Manager command, two image references"]]
end

subgraph box ["On the instance, deploy script"]
  pull["Pull both images first"]
  pgUp["Bring Postgres up and wait for healthy"]
  migrateRun{{"Run the migrate container: drizzle-kit migrate"}}
  appUp["Bring the application up and wait for healthy"]
  healthProbe{{"Probe the health route"}}
  pageProbe{{"Fetch a real page"}}
end

invalidate["Invalidate the edge"]
smoke{{"Fetch the health route through the public site URL"}}
serving([New release serving])
stop([Deploy fails, previous release still serving])

push --> quality
push --> e2eJob
push --> tfJob
push --> oidc
oidc --> runtimeImage
runtimeImage -->|shared layers already cached| migrateImage
migrateImage --> sendCommand
sendCommand --> pull
pull --x|pull failed, nothing changed| stop
pull --> pgUp
pgUp --> migrateRun
migrateRun --x|a migration failed| stop
migrateRun --> appUp
appUp --> healthProbe
healthProbe --x|no database| stop
healthProbe --> pageProbe
pageProbe --x|renders but will not serve| stop
pageProbe -->|command succeeded| invalidate
invalidate --> smoke
smoke --> serving
smoke --x|not 200| stop

classDef human    fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#0F172A
classDef client   fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2px,color:#0F172A
classDef ours     fill:#ECFDF5,stroke:#047857,stroke-width:2px,color:#0F172A
classDef guard    fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#0F172A
classDef vendor   fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
classDef phi      fill:#FEE2E2,stroke:#B91C1C,stroke-width:2px,color:#0F172A
classDef artifact fill:#F5F3FF,stroke:#6D28D9,stroke-width:2px,color:#0F172A

class push,serving human
class stop phi
class quality,e2eJob,tfJob,runtimeImage,migrateImage,pull,pgUp,appUp,invalidate ours
class oidc,sendCommand,migrateRun,healthProbe,pageProbe,smoke guard
linkStyle 8,11,14,16,20 stroke:#B91C1C,stroke-width:3px
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
  written with a hashed address. That reduction is the one canonical form, shared
  with the validation schemas, because storage and lookup once had separate
  versions of it and a number written differently stayed contactable. On the
  right, a later contact form submission is captured. Before anything is queued,
  the suppression check matches the submitted email or the submitted digits
  against that table. A match does not discard the submission: the person did fill
  in the form, so the lead is still stored as a record. What a match stops is the
  outbox row, so nothing is delivered to the CRM or the dialer, and it stops the
  acknowledgement email. The visitor still receives a success response, because
  telling them they are suppressed would leak that someone else's record exists.
  Releasing a suppressed lead is a human decision. A suppression row carries no
  retention date, because it has to outlive the lead it suppresses.
}

person([Someone revoking consent])
optOutForm["Do-not-contact form"]
optOutRoute["/api/do-not-contact"]
noTurnstile{{"No Turnstile, no identity check, by design"}}
validateDnc{{"Validate the request"}}
canonical["Lowercase the email, keep the last ten digits"]
dncTable[("dnc_requests")]
handled["A human actions it in the CRM and the dialer"]

visitor([A later visitor])
leadForm["Contact form"]
leadRoute["/api/leads"]
capture["captureLead"]
suppressionCheck{{"isSuppressed: match email or digits"}}
leadsTable[("leads")]
outboxTable[("crm_outbox")]
confirmEmail["Acknowledgement email"]
response["201, success either way"]
drain["Outbox drain"]
crm[MedicarePRO CRM and dialer]
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
