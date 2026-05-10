# Email + CRM setup playbook — 2026-05-09

This is the click-by-click for everything that has to be set up *outside* the codebase before TopUni can credibly receive partner inquiries, send transactional emails, and run the cold-outreach plan. Most of this is vendor signups and DNS — none of it can be coded around.

Read top to bottom. Each phase has a **one-click endpoint** at the end.

---

## Phase 0 — what you already own

- Domain `topuni.org` is referenced as the canonical site in `ScholarshipsByFilter.tsx:53`. Confirm you own it: check your registrar (likely Namecheap, Porkbun, or Squarespace Domains). If you can't log in, that's the actual blocker — recover access first.
- Vercel deploy: not yet pointed at `topuni.org`. Step in Phase 1.
- Supabase project: `bsfldtpemfxhnkdzccib` (`tu-consulting`).
- Existing email infra in code: `supabase/functions/process-email-queue` (already integrated with Resend for product lifecycle emails). Means the project's email-send pattern is established — the new partner-inquiry-notify follows the same Resend pattern.

---

## Phase 1 — Domain email (Google Workspace, ~30 min)

**Why Workspace and not free forwarding:** you're pitching to school principals at Haileybury and KIS Almaty. `samuel@topuni.org` lands; `samuel.shn.han@gmail.com` doesn't. Free Cloudflare Email Routing only forwards inbound — it can't *send* from `topuni.org`, so it fails the credibility test on day one.

### Click-by-click

1. **Sign up Google Workspace** — https://workspace.google.com/business/signup → Business Starter ($6/user/month). Enter `topuni.org` as your domain.
2. **Verify domain ownership** — Workspace gives you a TXT record. Add it to your DNS (registrar control panel). Verify in Workspace.
3. **Add MX records** — Workspace gives you 5 MX records. Add them all. Delete any pre-existing MX records that point elsewhere.
4. **Create mailboxes** — in Workspace admin (admin.google.com → Directory → Users):
   - `samuel@topuni.org` — your primary
   - `nurzada@topuni.org` — Nurzada Abdivalieva (co-founder)
   - `josh@topuni.org` — Josh Hughes (lead consultant)
   - `aigul@topuni.org` — Aigul Abdoubaetova (senior advisor)
   - `partnerships@topuni.org` — alias forwarded to samuel@ initially (group, not seat)
   - `admissions@topuni.org` — alias forwarded to samuel@
   - `hello@topuni.org` — alias forwarded to samuel@
5. **Set up SPF / DKIM / DMARC** (deliverability — without these, your emails go to spam):
   - SPF: TXT record at `@`: `v=spf1 include:_spf.google.com ~all`
   - DKIM: in Workspace admin → Apps → Google Workspace → Gmail → Authenticate email → Generate. Add the resulting TXT at `google._domainkey`.
   - DMARC: TXT at `_dmarc`: `v=DMARC1; p=none; rua=mailto:samuel@topuni.org` (start with `p=none` to monitor; tighten to `p=quarantine` after 2 weeks of clean reports)
6. **Verify deliverability** — send a test from `samuel@topuni.org` to `mail-tester.com`. Aim for 9/10 or higher. Fix anything that scores you down.

**One-click endpoint:** `samuel@topuni.org` sends and receives, scores ≥9 on mail-tester.com.

---

## Phase 2 — Transactional email for the product (Resend, ~15 min)

The product needs to send emails *as TopUni* programmatically: partner inquiry notifications, acknowledgement to the institution, future signup welcomes, password resets, lifecycle nudges. Workspace is for human-to-human. Resend is for code-to-human.

### Click-by-click

1. **Sign up Resend** — https://resend.com → free tier (3K emails/mo, 100/day). $20/mo for 50K when you outgrow free.
2. **Add `topuni.org` as a verified domain** — Resend → Domains → Add. Resend gives you 3-4 DNS records (SPF, DKIM, return-path). Add to your registrar.
3. **Wait for verification** — usually 5-15 min after DNS propagates.
4. **Create an API key** — Resend → API Keys → Create. Name it `tu-consulting-prod`. Scope: Send Access. Copy the `re_…` key.
5. **Add 3 secrets to Supabase** — `supabase secrets set --project-ref bsfldtpemfxhnkdzccib RESEND_API_KEY=re_xxx PARTNER_INQUIRY_FROM_EMAIL='TopUni Partnerships <partnerships@topuni.org>' PARTNER_INQUIRY_NOTIFY_EMAIL=samuel@topuni.org`
6. **Test** — submit a test inquiry on `/topuni-ai/partners`. You should get the team alert; the test email should get the acknowledgement.

**One-click endpoint:** test partner inquiry triggers two emails (alert + ack) within 30 sec.

**Note on the `From:` address:** use `partnerships@topuni.org` (Phase 1 alias), not `samuel@`. Keeps your personal sending reputation separate from product-automated sending.

---

## Phase 3 — Auto-responses (no extra cost, ~10 min)

### Personal vacation/availability autoresponder
Workspace → Gmail → Settings → Vacation responder. One per mailbox. Keep it short:
> "Got your message — I'll reply within 48h. For TopUni partnership inquiries, please use the form at topuni.org/topuni-ai/partners so it routes to the team."

### Product auto-acknowledgement
**Already shipped** — the partner-inquiry-notify edge function sends a localised auto-ack (EN/RU) to whoever submits the form. When you set Phase 2 secrets, it activates.

---

## Phase 4 — CRM (decide based on scale)

You don't have a CRM problem yet. You have a no-leads problem. Don't pre-build pipelines for inquiries that don't exist.

### Free, in-app, today
**`/admin/partner-inquiries`** — already shipped this session. Status pipeline: pending_review → contacted → qualified → closed_won / closed_lost. Notes textarea per row. Adequate for the first 50 institutional leads.

### When you outgrow it (~50 inquiries / month)
- **HubSpot Free** — best free CRM. Decent contact + deal pipeline. Integrates with Workspace email so threads auto-log. Sign up at hubspot.com → CRM → Free.
- **Attio** — better looking, more flexible. Free tier exists. attio.com.
- **Don't pay for Salesforce / Pipedrive** at this stage. You're pre-revenue.

### Student-side CRM
For when actual student users start signing up: Supabase already has `student_profiles`. The `/admin/insights` and `/admin/funnel` pages are your built-in CRM for students. No external tool needed for v1.

**Trigger to revisit:** when you have >100 student users active in a 30-day window OR the team grows past 3 people who need to coordinate inquiries.

---

## Phase 5 — Cold outreach infrastructure (THE BIG ONE — read carefully)

You have a list of 70 verified prospects in `docs/outreach_prospects_2026-05.md` — Haileybury, KIS, Hope Academy, EducationUSA, etc. **Do not send those emails from `samuel@topuni.org` once Workspace is set up.** Here's why:

### The reputation trap
Workspace mailboxes are designed for human-to-human communication. Send 50 cold emails in a day from `samuel@topuni.org` and:
- Gmail flags your sending pattern as suspicious → throttles you
- Recipient mail servers (Outlook, Yahoo, Yandex, Mail.ru) start auto-spam-foldering everything from `topuni.org`
- Your DOMAIN reputation is now compromised — your *transactional* emails (the auto-acks from Resend) also start hitting spam
- Recovery: 60-90 days minimum, often longer

This is the single most common own-goal of seed-stage founders.

### The right setup
Use a dedicated cold-outreach tool on a *separate sender domain* with proper warmup:

1. **Buy a sister domain** — `topuni.io`, `gettopuni.com`, `topunihq.com`, or a country-specific (`topuni.kz`, `topuni.kg`). $10-20/yr. This is your *outreach* domain.
2. **Pick a cold-outreach tool:**
   - **Instantly.ai** ($37/mo) — easiest, includes built-in domain warmup
   - **Smartlead** ($39/mo) — slightly more powerful, similar UX
   - **lemlist** — fancier, more expensive ($59/mo); skip unless you need their personalisation features
3. **Set up DNS for the outreach domain** — same SPF/DKIM/DMARC as Phase 1, but pointing at the cold-outreach tool's verified senders.
4. **Create 2-3 outreach mailboxes** on the new domain via Google Workspace or the tool's native mailbox setup: `samuel@topuni.io`, `samuel.han@topuni.io`, `partnerships@topuni.io`.
5. **Warmup for 2 weeks before any real send** — Instantly/Smartlead has built-in warmup (mailboxes auto-converse with each other to build sender reputation). Do not skip this. Do not send a single real cold email during warmup.
6. **Set up forwarding** — replies to `samuel@topuni.io` forward to `samuel@topuni.org` so you triage in your real inbox.
7. **Send the prospect list** — start with 20 emails/day per mailbox (so 60/day with 3 mailboxes), ramp to 50/day per mailbox over 2 weeks.

**Daily send cap** with 3 warmed mailboxes = 150 emails/day = your full 70-prospect list reachable in ~half a day, with multi-touch follow-up rhythm (D+0, D+3, D+10) over 2-3 weeks.

**One-click endpoint:** Instantly campaign loaded with the 70-prospect CSV, warmup complete, first 20-email batch scheduled.

---

## Phase 6 — what's NOT on this list (and why)

- **Calendly / scheduling** — already linked in your outreach templates. If you don't have a Calendly account, sign up free; the link is already in your email copy as `[calendly link]`.
- **Slack / Discord for the team** — premature. Email + WhatsApp is fine for 4 people.
- **Notion / project management** — premature. Use Linear ($8/user/mo) only if dev velocity becomes the bottleneck.
- **Analytics platform** — already have basic event tracking via `analytics_events` table + `/admin/funnel`. Don't add Mixpanel/Amplitude until you have >1000 weekly users.
- **Live chat / Intercom** — premature. The form-then-email flow is enough for institutional leads. For students, use the in-app counselor chat that's already wired.

---

## Order of operations — actual execution sequence

If you do these in any order other than this, you'll waste time:

1. ✅ Confirm `topuni.org` registrar access
2. ✅ Set up Workspace (Phase 1) → DNS records → mailboxes → SPF/DKIM/DMARC
3. ✅ Set up Resend (Phase 2) → verify domain (more DNS) → API key → Supabase secrets
4. ✅ Submit a test partner inquiry → confirm both emails arrive
5. ✅ Soft-launch: tell ~10 friends in your Yale/Cambridge/CIS network the URL → live test the full funnel
6. ✅ Buy outreach sister domain → set up cold-email tool → 2-week warmup
7. ✅ Send the 70-prospect list

Anything past step 5 should wait until the product is verified working end-to-end (Stripe + scholarship data + hosting all green).

---

## Cost summary (recurring monthly)

| Item | Cost | Notes |
|---|---|---|
| Google Workspace × 4 seats | $24/mo | Samuel + 3 team members |
| Resend (free tier) | $0/mo | Bumps to $20/mo at 50K emails |
| Cold-outreach domain | ~$1.50/mo | Annual prepay |
| Instantly.ai | $37/mo | Outreach platform |
| **Total to launch outreach** | **~$62/mo** | + the existing Vercel/Supabase/Stripe costs you already pay |

If you want to defer some of this: Phases 1+2 ($24/mo) are non-negotiable for credibility. Phase 5 (~$38/mo) can wait 30 days if you're focused on inbound funnels first.
