# TopUni Business Growth Blueprint

Last updated: 2026-05-04

## Core Thesis

TopUni should not position itself as "AI admissions consulting." That is too broad and easy to copy.

The stronger wedge is:

> The admissions operating system for ambitious international students who need scholarships.

This makes the business sharper because it combines three painful jobs:

1. Find realistic funded opportunities.
2. Understand what each opportunity actually rewards.
3. Execute essays, deadlines, documents, and decisions without losing momentum.

The repo already supports this direction: TopUni AI, Discover, scholarship detail pages, pipeline, calendar, essay critique, referrals, public briefs, email nudges, and admin data quality tooling.

## Product Strategy

### 1. Make Scholarships the Wedge

Students do not wake up wanting "consulting." They wake up worried that top universities are unaffordable.

Lead with:

- "Find the scholarships you can actually win."
- "Get a ranked plan for your profile."
- "Turn it into applications before deadlines pass."

Admissions strategy then becomes the premium layer, not the first thing users have to believe.

### 2. Build the Main Loop Around One Saved Scholarship

The activation moment should be:

1. Student enters profile.
2. TopUni returns 3 credible scholarship matches.
3. Student saves one.
4. TopUni generates the first checklist and deadline timeline.
5. Student gets nudged back when the next action is due.

This loop is stronger than a long AI report because it creates an object of commitment: one application in motion.

### 3. Make Public Briefs the Viral Surface

Public strategy briefs can become the shareable artifact:

- Student shares with parents.
- Parent sees seriousness and value.
- Friends ask how it was made.
- Counselors and partner schools see a useful planning tool.

Each brief should have a clear CTA:

- "Generate your own plan"
- "See matching scholarships"
- "Upgrade to full checklist"

### 4. Use Founding Membership for Urgency, But Sell Outcome

The pricing page should not rely mainly on scarcity. Scarcity helps, but the offer must stand without it.

Primary value promise:

- ranked scholarship intelligence
- personalized strategy report
- monthly live execution support
- essay and checklist help
- deadline nudges

Better pricing tests:

- Free: top 3 scholarship matches + basic brief.
- Pro monthly: full database, strategy notes, checklists, workshops.
- Application Sprint: fixed-price 30-day intensive for one target scholarship.
- School/partner plan: bulk access for counselors or prep centers.

### 5. Turn Data Quality Into Trust

TopUni has a real advantage if the database is verified and maintained. Make that visible.

Trust signals to surface:

- last verified date
- official source link
- "may have moved" warnings
- source provenance
- eligibility caveats
- common rejection reasons

The business can win on "less hallucination, more verified opportunity intelligence."

## Messaging

### Current Direction

"Your tailored admission strategy in minutes" is clear, but still sounds like a report generator.

### Stronger Homepage Promise

"Find scholarships you can actually win, then turn them into applications."

Supporting copy:

"TopUni ranks international scholarships against your profile, explains what each one rewards, and gives you the plan, deadlines, and essay support to apply with confidence."

### Stronger Pricing Promise

"Stop paying thousands just to learn where to apply. Get the scholarship intelligence, strategy, and monthly execution support that keeps applications moving."

## Growth Loops

### SEO Loop

Existing surfaces:

- scholarship detail pages
- country, field, and theme landing pages
- country guides
- blog

Next improvements:

- every scholarship detail page should have "who should apply" and "who should skip"
- each SEO hub should push into a prefilled profile flow
- generate comparison pages such as "Chevening vs DAAD for Kazakhstan students"

### Referral Loop

Existing surfaces:

- referral capture
- referral hub
- public briefs

Next improvements:

- reward sharing a brief with one unlocked premium section
- give students a "parent view" link
- create partner codes for schools, counselors, and influencers

### Retention Loop

Existing surfaces:

- pipeline
- calendar
- weekly nudges
- document OCR
- counselor chat

Next improvements:

- convert every saved scholarship into a task checklist
- send deadline and missing-document nudges
- weekly "one thing to do next" email

## Build Priorities

### Week 1: Sharpen Activation

- Make `/discover` the main entry after homepage CTA.
- Ensure profile completion produces saved top matches.
- Put "Save one scholarship to generate your checklist" in the results state.
- Add event tracking for profile start, results viewed, scholarship saved, paywall viewed, checkout started.

### Week 2: Make the Paid Upgrade Feel Inevitable

- Gate deeper strategy notes, common rejection reasons, and checklist generation.
- Keep enough free value to prove match quality.
- Add one concrete unlocked deliverable: "Your first scholarship checklist."
- Replace any placeholder proof with honest product-use cards until real testimonials exist.

### Week 3: Make Trust Visible

- Add verification badges and dates consistently across cards, detail dialogs, and SEO pages.
- Add "source last checked" copy.
- Add admin alerts for high-traffic scholarships with stale verification.

### Week 4: Launch a Narrow Sprint Offer

Offer:

"Scholarship Sprint: pick one scholarship, leave with a complete application plan in 7 days."

Why:

- easier to sell than broad consulting
- validates willingness to pay
- creates real success stories
- feeds product requirements for automation

## Metrics

Track these as the core business dashboard:

- visitor to profile start
- profile start to results
- results to saved scholarship
- saved scholarship to account created
- account created to paid upgrade
- paid upgrade to first checklist
- checklist to application submitted
- public brief shares per generated brief
- referral signups per user

## Immediate Repo Notes

During this audit, two trust and routing fixes were made:

- `/faq` and `/faq/ru` now route to the actual FAQ pages instead of Why TopUni pages.
- Pricing proof cards now describe real product use cases instead of placeholder testimonials.

## Strategic North Star

TopUni wins if it becomes the place where an international student goes from:

"I do not know what is realistic or affordable"

to:

"I have three scholarships worth applying for, a plan for each, and the next action on my calendar."
