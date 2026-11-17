# Deck Script (EN) — Secondhalf — AI After-Sales Platform

> Purpose: English counterpart of `PPT大纲_AI售后客户介绍.md` (v2, 2026-11-16). Same story, same page order, one-to-one with the Chinese deck so the two decks can be cloned from a single generator. Every page lists its English title, bullets, the English screenshot file (from `output/ppt_shots_en/`), and delivery notes.
> Audience: the English-reading version of the Chinese deck's audience — decision makers at cross-border brands, plus their overseas teams. Factory and dealer contacts are covered as invited collaborators.
> Product name: **Secondhalf — AI After-Sales Platform** (short form in UI copy: Secondhalf). In product screenshots the prototype brand header still reads "AI After-Sales · Brand Console"; the cover, footers and all body copy use Secondhalf.
> Page count: 35 + 2 appendix, ~25–30 min. Palette: teal `#0E7A6C` from the prototype; dark backgrounds only on cover, section dividers and the knowledge-graph page.
> Screenshots: `output/ppt_shots_en/` — backend 1440×900 @2x (`bk-*`), H5 and tracker 390-wide phone frames (`h5-*`, `track-*`). All pages captured with the backend in English mode (`?lang=en`); customer-typed text and the Chinese source column in manual review are intentionally left as-is.
> Sample cast: brand **IronPeak Fitness** (Yang Meng) / factory **Ningbo Lijian Machinery** (Li Gong) / dealer **NordicGym AB** (Erik); products **SM-900** Smith machine, **TR-650** treadmill, **RW-300** rower, **F-C20** Functional Trainer.
> UI terms follow the backend's English dictionary: Agent, Ticket handling, Products, Knowledge base, Manual generation, QR codes, Orders & collaboration, Analytics, Spare parts & stock, Settings; statuses "Awaiting brand after-sales", "Escalated to factory", "Resolved"; queue "Your decision is needed".

---

## Act I · Why this exists (3 pages)

### P1 Cover
- **Title:** Secondhalf — AI After-Sales Platform: every overseas service case, handled end to end
- **Subtitle:** Start by QR code or email · AI first response in the customer's language · brand, factory and dealer work in one console · progress the customer can follow
- **Visual:** three-device collage — H5 phone frame (`h5-landing.png`), tracker phone frame (`track-detail-en.png`), backend PC frame (`bk-agent-home.png`)
- **Note:** say the product name once, then let screenshots carry the rest.

### P2 How after-sales runs today
- **Title:** One complaint, 14 emails, 21 days, three companies passing it along
- **Bullets:**
  - Real case FWT-61 (F-C20, a German end customer → brand service → trading partner relay → factory): technical Q&A took 2.5 days; spare-part confirmation 5 days (the address was re-typed 3 times, the factory asked back "do you want part 20?"); 4 days from dispatch to tracking number; the customer followed up only because a human remembered to nudge.
  - The problem is not effort — information lives in mailboxes, nobody watches the clock, and every hand-over needs a human to translate and re-tell.
- **Visual:** native-shape 21-day timeline, 4 pain points in red
- **Note:** all numbers in this page are from the real case; keep the words "real case".

### P3 We turned that chain into a platform
- **Title:** The customer on one end, the brand on the other, factory and dealer in between — the AI agent in the middle
- **Bullets:**
  - Three ends, one engine: consumer side (QR-code H5 / email / tracker page), brand console (PC web), factory and dealer sign in by invitation and see only their share.
  - The AI does five things: detect language and product, match the knowledge base and answer, decide when a human must take over, watch SLAs and tracking numbers, translate and relay between the three parties.
  - No change to how overseas users send email; no app to install; no new mailbox.
- **Visual:** native-shape overview architecture + three cropped screenshots (`h5-chat-open.png`, `bk-tickets-list.png`, `track-list-en.png`)
- **Note:** the "five things" line is the single sentence customers should remember.

---

## Act II · The customer side, end to end (9 pages)

### P4 Section divider
- Two entry points (QR code, email) + one tracker page: start → AI and human hand-over → follow to resolution
- Visual: `h5-lang.png` blurred/darkened as background

### P5 Entry one: a fixed QR code on the machine
- **Title:** Scan and the service window opens — no app, no sign-up
- **Bullets:**
  - No per-unit codes: one code per model, optionally per batch or per supplier; downloadable as SVG / PNG for print.
  - Landing page: model already identified, language selectable, two actions — "Start a request" / "See the manual".
- **Visual:** backend QR card with a real scannable code (`bk-qr.png`) + H5 landing frame (`h5-landing.png`)
- **Note:** "fixed code, not per-unit" is a deliberate cost decision — say why.

### P6 The H5 four-step corridor
- **Title:** Pick a language → photograph the label → confirm the device → start the conversation, four screens
- **Bullets:**
  - Seven languages: 中文 / English / Deutsch / Español / Français / Svenska / Italiano.
  - Photograph label → model and serial recognised → order, batch, dealer and warranty linked automatically; "label unreadable? ask directly" so nobody hits a dead end.
- **Visual:** four phone frames side by side (`h5-lang.png`, `h5-label.png`, `h5-label-confirm.png`, `h5-chat-open.png`)

### P7 H5 conversation: the ticket exists before the customer types
- **Title:** Before the customer writes a word, the brand console already has this ticket
- **Bullets:**
  - Entering the conversation opens the ticket; the card at the top says "Request T-… is open and copied to our support team" — the customer knows a human is behind it.
  - The AI answers from the product knowledge base: steps and videos, at most two clarifying rounds, safety parts (cables, catches) go straight to a human, small parts within rules are promised on the spot.
  - "Still not fixed" is never looped back into more questions — it goes to a service engineer; email and rating at the end.
- **Visual:** three phone frames (`h5-chat-open.png`, `h5-chat-safety.png`, `h5-chat-end.png`)

### P8 Entry two: the customer just emails, the AI reads first
- **Title:** Take over the brand's service mailbox; every incoming mail goes through ten automatic steps
- **Bullets:**
  - Pipeline: detect language → identify product / serial → match order → search the KB → compare confidence to threshold → hard rules (safety part / refund / negative sentiment / B2B) → same-batch clustering → merge into an existing thread → decide → open a ticket.
  - Three outcomes: confident → reply in the customer's language; nearly there → ask a follow-up; unsure or rule hit → hand to brand service with the AI's parsed summary attached.
  - Replies are judged automatically: "thanks, solved" closes the ticket; "thanks, but still E07" does not; a new mail within 7 days of closure reopens it.
- **Visual:** "Simulate incoming email" step panel, German cable email ending at "safety part → human" (`bk-tickets-sim-email.png`)

### P9 The three-level relay after the AI
- **Title:** AI → brand service → factory, every level has a clock
- **Bullets:**
  - State machine: AI processing → repair guidance (teach self-repair first, 2-day follow-up window) → awaiting brand service (4 h) → escalated to factory (24 h) → resolved; overdue turns red into "Your decision is needed".
  - Repair first: guide before shipping, so spare parts are not the first move.
  - Commitments: small parts up to USD 50 are promised automatically and deducted from stock; anything above waits for the brand.
- **Visual:** native-shape state flow + a cropped ticket row with SLA overdue in red (`bk-ticket-late.png` crop)

### P10 The tracker page: who has it, by when, visible to the customer
- **Title:** One link in the email — no more "any update on this?"
- **Bullets:**
  - Status banner: who holds the request now, plus one wide promise time; when overdue it flips to "getting it done urgently".
  - One email address, many tickets, auto-grouped (open / resolved); EN/DE/ZH interface; reply pre-filled with the ticket number; manual entry point.
- **Visual:** tracker list (`track-list-en.png`) + detail top (`track-detail-en.png` top crop)

### P11 Progress rail and customer projection
- **Title:** One line under every milestone — the customer sees only what they should
- **Bullets:**
  - Rail: Request received → First reply → Engineer assigned / escalated → Commitment sent → Dispatched → Tracking number (copyable) → Delivered → Resolved, each with a one-line summary of what is happening.
  - Customer projection: raw factory text, internal notes and system actions never appear; only customer-facing content is projected.
- **Visual:** rail + shipment card from the FWT-61 customer view (`track-detail-en.png` middle) next to the same ticket's backend timeline (`bk-ticket-fwt61-timeline.png`)

### P12 The customer side in one page
- **Title:** From scan or email to resolution and rating, the customer does three things
- **Bullets:**
  - Swimlane: Customer / AI / Brand / Factory; the customer lane holds only "start, follow the steps or reply, rate".
  - Two typical runs: A — treadmill belt drifting (AI resolves same day); B — cable fraying (safety part → human → factory confirms → shipment → delivered).
- **Visual:** native-shape swimlane

---

## Act III · Three parties in one console, with one knowledge base (14 pages)

### P13 Section divider
- One console, three identities, visibility follows the order relationship
- Visual: three sidebars (`bk-sidebar-brand.png` / `bk-sidebar-factory.png` / `bk-sidebar-dealer.png`)

### P14 Sign-in and roles
- **Title:** The brand opens the console; factory and dealer come in by invitation and see only their orders
- **Bullets:**
  - Three roles: brand admin (everything, sole customer-facing voice), factory sales (tickets, batches, stock for orders it supplies; customer identity masked), dealer (tickets and orders within its own orders; can mark "handled at store").
  - Invitation by order; once accepted the person becomes a member of that order (or of all the factory's orders); revoking them returns their tickets to the brand.
  - Left menu in four groups: Workspace / Products & knowledge / Operations / Configuration; each role sees its own menu.
- **Visual:** three sidebars side by side; add short callouts
- **Note:** this page carries the whole permission story — do not rush it.

### P15 Agent home: first see "Your decision is needed", then act in one sentence
- **Title:** The first screen after sign-in is not a report — it is what only you can decide today
- **Bullets:**
  - "Your decision is needed" aggregates: awaiting brand service, SLA overdue, shipment awaiting your confirmation, dispatched without tracking, quality incidents to verify, AI-suggested escalations, factory replies awaiting release, manuals awaiting review, orders without a factory contact, unaccepted invitations.
  - Natural language executes for real: "Give me a summary of today's new tickets", "Generate German and French manuals for SM-900", "Invite Chen Gong from Qingdao Maidong as factory contact", "Set the confidence threshold to 80".
- **Visual:** full agent home (`bk-agent-home.png`) + one summary conversation (`bk-agent-summary.png`)

### P16 Ticket list
- **Title:** Complaints from every channel in one table — filterable, exportable
- **Bullets:**
  - Filter by status / channel (Email, QR code H5, logged on behalf) / product / language / batch; search; export CSV; status and SLA computed live.
  - "Simulate incoming email" and "Log on behalf" run the same pipeline.
- **Visual:** full list (`bk-tickets-list.png`)

### P17 Ticket detail
- **Title:** One ticket holds the whole case — no more 14 loose emails
- **Bullets:**
  - Full timeline (customer original + AI translation + internal notes, layered), AI-drafted reply you can edit or rephrase, escalate to factory, mark resolved, confirm shipment (auto stock deduction), back-fill serial.
  - One email splits into sub-issues, each with a checklist and owner, none blocking the others; shipment records promise date, dispatch and tracking — no tracking number 24 h after dispatch triggers a follow-up; quality incidents (CAPA) close only after factory verification and brand confirmation.
- **Visual:** FWT-61 drawer — top (`bk-ticket-fwt61-top.png`), sub-issues + shipment + CAPA (`bk-ticket-fwt61-bottom.png`), timeline (`bk-ticket-fwt61-timeline.png`)

### P18 Three-party collaboration: how the AI handles "escalate to factory"
- **Title:** The brand clicks escalate; the AI finds that order's factory contact itself
- **Bullets:**
  - Resolution chain: ticket → order → that order's factory contact. Active → assign and notify; pending → assign and nudge; none → escalation is blocked and an invitation carrying this ticket pops up.
  - Factory replies land in "awaiting release"; after the brand confirms, the AI translates them into the customer's language — the brand stays the only customer-facing voice.
  - Batch clustering only produces a suggestion, never an automatic escalation; dealers can mark "handled at store" and never join the escalation chain.
- **Visual:** escalation preview with recipient found (`bk-escalate-found.png`) + blocked escalation with invitation (`bk-escalate-blocked.png`)

### P19 What factory and dealer see after signing in
- **Title:** Each sees their own slice, on the same line
- **Bullets:**
  - Factory sales (Ningbo Lijian · Li Gong): tickets (customer masked to language region, serial and batch, AI summary), batches it supplies with complaint rates, spare-part stock, replies go to the brand for release, cannot close tickets.
  - Dealer (NordicGym · Erik): menu reduced to Agent, Ticket handling, Orders & collaboration, Spare parts & stock; sees only tickets within its own orders; cannot escalate.
- **Visual:** factory ticket view (`bk-role-factory-ticket.png`) + dealer ticket list (`bk-role-dealer-tickets.png`)
- **Note:** both sidebars come from the same console via the identity switcher — show it at the bottom-left.

### P20 Orders and collaboration invitations
- **Title:** Organisation default + order override + per-ticket engineer
- **Bullets:**
  - Each factory / dealer gets an organisation-level default contact (covers current and future orders); individual orders can override or exclude it; a factory contact can pull in their own engineers on a single ticket.
  - New order or CSV import (ERP-ready), serial prefix and batch validated immediately; invitations can select several orders; orders without a contact turn red in "Your decision is needed".
- **Visual:** orders page (`bk-orders.png`) + invitation modal with multi-select orders (`bk-orders-invite.png`)

### P21 Knowledge base: one graph that shows the AI's evidence
- **Title:** Product line — entries — documents — parts — glossary — gaps, connected in a living graph
- **Bullets:**
  - Product is the centre node; entries grow with 90-day hit counts; safety parts carry an amber ring; documents coloured by type; parsing documents pulse; gaps are dashed "!" nodes. Hover for details, click to jump to the entry / document / term; selecting a product line filters the whole page.
- **Visual:** graph, all product lines (`bk-kb-graph-all.png`) + focused on one (`bk-kb-graph-focus.png`)

### P22 Knowledge base tabs
- **Title:** Documents come in, entries get used, terms stay consistent, gaps get owners
- **Bullets:**
  - Documents (manuals / exploded views / 3D models / past complaints / fault-code tables / installation videos — type and product auto-detected on ingest); entries (multilingual keywords, steps, shippable parts, safety flag, reply templates, sources, 90-day hit / resolved / AI-resolved counts); glossary (AI fills minor-language columns, highlights terms to confirm); AI gap insights (unmatched complaints, products without documents, documents without entries, missing 3D, missing compliance fields, missing terms — each with an action).
- **Visual:** 2×2 grid (`bk-kb-tab-files.png`, `bk-kb-tab-entries.png`, `bk-kb-tab-terms.png`, `bk-kb-tab-gaps.png`)

### P23 Products and batches
- **Title:** Which batch is failing — see it before complaints pile up
- **Bullets:**
  - Product profile with compliance fields; batch sub-table: batch no., supplier, production / first shipment, units shipped, orders, complaints, complaint rate, QR code; flags "suspected batch defect" and "attention".
  - One click from the product to its knowledge base, manual tasks and QR codes; the factory role sees only batches it supplies.
- **Visual:** product table with SM-900 batch sub-table expanded (`bk-products-batches.png`)

### P24 QR code management
- **Title:** One per model, per batch or per supplier — switch granularity any time
- **Bullets:**
  - Generate print-ready SVG / PNG; preview the H5 landing; scan counts and ticket conversions come from real tickets; a mismatch between scanned batch and label serial is flagged on the ticket.
- **Visual:** full QR page (`bk-qr.png`, plus `bk-qr-batch.png` for batch mode)
- **Note:** you can scan the screen with a phone live in the meeting.

### P25 Analytics and spare-part stock
- **Title:** Numbers computed live, stock replenished ahead of need
- **Bullets:**
  - Analytics: 7 / 30 / 90 days, daily handled-by stacked bars (AI / human / factory / store), top faults, channels, languages, ratings, one-click weekly report.
  - Spare parts: restock suggestions derived from the last 90 days of faults; AI-committed shipments and brand-confirmed replacements deduct stock automatically; below-safety-stock alerts; restock order download.
- **Visual:** analytics (`bk-analytics.png`) + parts & stock (`bk-parts.png`)

### P26 Settings: the rules are yours
- **Title:** When the AI may answer alone and when it must show a human — all set by you
- **Bullets:**
  - Policy panel: mailbox connections (several), routing people and per-level SLAs, confidence threshold (with a live replay of the last 30 days' direct / ask / hand-off split below), hard rules and trigger words, what the AI may promise and up to what amount, H5 languages and look.
  - Every change records who changed what and when; critical items need a dual sign-off from technology and business.
- **Visual:** settings policy panel with threshold replay and audit log (`bk-settings-policy.png`, `bk-settings-audit.png`)

---

## Act IV · Manual generation (5 pages)

### P27 Section divider
- The same knowledge base answers complaints and generates multilingual manuals

### P28 Why manuals live on the same platform
- **Title:** The troubleshooting steps on the H5 page and in the manual are the same text
- **Bullets:**
  - Manual troubleshooting chapters, KB entries and glossary share one source; the product table shows each model's manual language status (delivered / generating / in review).
  - A missing manual or missing language is itself a gap and appears in the gap insights.
- **Visual:** product table manuals column (`bk-products-manual-col.png`) + an entry's source documents (`bk-kb-tab-entries.png` crop)

### P29 Three-step wizard and task progress
- **Title:** Choose the model, the languages, the market — three steps and generation starts
- **Bullets:**
  - Wizard: model → target languages (multi-select) → market and template; progress advances live; in the Agent, one sentence ("Generate German and French manuals for SM-900") is equivalent.
- **Visual:** wizard steps (`bk-manuals-wizard-1/2/3.png`) + task list (`bk-manuals-list.png`)

### P30 Review workbench: terms and compliance together
- **Title:** Chinese source beside the generated text, terms highlighted, compliance items decided one by one
- **Bullets:**
  - Compliance is computed from the target market and the product profile: a missing max user weight blocks approval outright; filling it in writes back to the product and re-checks. Term inconsistencies are highlighted for confirmation.
- **Visual:** full workbench (`bk-manuals-review.png`) + inspection panel (`bk-manuals-compliance.png`)
- **Note:** the left column is intentionally the Chinese source — do not "fix" it in the screenshot.

### P31 Delivery and feedback loop
- **Title:** Confirm delivery → languages update, troubleshooting enters the KB, delivery pack downloads
- **Bullets:**
  - Return → regenerate; deliver → product language list updates automatically and the generated text enters the knowledge base; delivery pack download.
  - Phase two: 3D assembly animations.
- **Visual:** delivery (`bk-manuals-delivered.png`, deliverables `bk-manuals-delivered-files.png`) + product table after update (`bk-products.png` crop)

---

## Act V · Case, delivery and next steps (4 pages)

### P32 Back to FWT-61: the same case on the platform
- **Title:** 14 emails → no more than 6; what compresses in those 21 days is coordination, not production
- **Bullets:**
  - Comparison table: technical Q&A (2.5 days → AI asks everything at once with a checklist; "factory does not disclose" is also a valid answer); spare-part confirmation (5 days → part numbers, address and recipient structured; the factory only confirms); tracking number (4 days after dispatch → auto follow-up at 24 h without one); customer follow-up (human memory → tracker page + 2-day repair-guidance window).
  - Say it plainly: the factory's 10-day production cycle is unchanged; the platform compresses both ends.
- **Visual:** two timelines, before / after (native shapes)

### P33 Phase-one scope and rollout (estimate)
- **Title:** Start by taking over one service mailbox; live in 8 weeks
- **Bullets:**
  - Phase one: mailbox takeover + fixed QR codes and H5 + customer tracker + brand console (tickets, collaboration, knowledge base, settings) + factory / dealer invitation sign-in + manual generation.
  - Estimated schedule: weeks 1–2 import products, orders, existing documents, AI drafts entries and terms; weeks 3–4 service confirms knowledge, mailbox connected, thresholds and rules set to the customer's habits, QR codes printed; weeks 5–7 pilot (start conservative, widen as the replay curve allows); week 8 review and go-live.
  - Phase two: deeper ERP stock integration, 3D animations, more channels; social channels not in scope yet.
- **Visual:** native-shape roadmap
- **Note:** label it "estimate; final schedule subject to the engineering team".

### P34 Deployment and data safety (estimate)
- **Title:** Customer data stays with the brand
- **Bullets:**
  - Two options: cloud dedicated tenant (default; data region EU / US / APAC) or private deployment on the customer's own cloud or servers.
  - Permission matrix: factory masked, dealer per-order, brand sole customer-facing; tracker projects customer-facing content only.
  - Auto-reply and auto-commit both sit behind thresholds, hard rules and a dual-sign lock; every rule change is auditable; mailbox access via authorisation, no stored passwords; model calls through enterprise APIs, never used for training.
- **Visual:** permission matrix table (role × see / do)
- **Note:** for EU customers add the GDPR wording — pending legal confirmation.

### P35 Next step
- **Title:** Bring one real complaint from your mailbox — we will run it through, live
- **Bullets:**
  - Ask for 1–2 real email complaints and one manual for a tailored demo; contact details; Q&A.
- **Visual:** reuse the three-device collage

---

## Appendix (2 pages, optional in the room)

### App A Speaking boundaries — what is real vs. simulated (internal, not for the customer)
- **Real logic in the prototype, demonstrable live:** the ten-step email pipeline, confidence and routing, hard rules, batch-clustering judgment, thread merging, live SLA, shipment commitments deducting stock, three-party collaboration and visibility, factory masking and release, the knowledge graph and gap insights, manual compliance computation, real QR codes, H5 ticket creation and tracker projection, policy panel and audit log.
- **Still simulated — present as "production capability":** label-photo OCR, real email send/receive and notification mails, LLM reply generation and translation (templates and keyword lists in the prototype), vector retrieval (keyword matching in the prototype), manual body generation and 3D animation, cross-device sync.
- **Numbers:** FWT-61's 14 emails / 21 days / 2.5 / 5 / 4 days are the real case; "≤ 6 emails" is a design target; ticket counts and hit rates inside the prototype are demo seed data and promise nothing; 8 weeks and the deployment options are estimates, subject to engineering schedule and legal review.

### App B Demo route (10 min, switching to the prototype live)
1. Console · Agent: show "Your decision is needed", type "Give me a summary of today's new tickets".
2. Ticket handling · Simulate incoming email: German cable (safety part → human + batch-cluster suggestion) → Spanish E07 (follow-up, no order guessing) → English refund (rule interception).
3. Open a ticket awaiting brand service: edit the AI draft and send; simulate a customer reply "Thanks, works now" (auto-close) and "Thanks, but still E07" (to human).
4. Settings: pull the threshold down to 75 and watch the replay ratio move.
5. QR codes: scan the screen with a phone → H5 in Deutsch → type SM9-24B-00931 → safety part to human → leave email and rating.
6. Back in the console: a QR-code H5 ticket appears at the top of the list; open the tracker `?demo=1` and pick that customer.
7. Manual generation: new SM-900 DE / FR task, walk review and compliance.
8. Switch identity to factory / dealer, show the menu and data scope change.
