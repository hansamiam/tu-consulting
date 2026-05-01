# samuelhan.com

A single-file static personal site. No build step, no dependencies.

## Deploy

Pick one of these — all free, all 5 minutes:

### Vercel (easiest)
1. `npm i -g vercel` (one time)
2. From this folder: `vercel`
3. Follow prompts → accept defaults
4. In the Vercel dashboard, go to your new project → Settings → Domains → add `samuelhan.com`
5. Update the DNS records on your domain registrar to point to Vercel (Vercel will tell you exactly what records to add)

### Netlify
1. Drag this folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
2. In dashboard → Domain settings → Add custom domain `samuelhan.com`
3. Follow the DNS instructions

### GitHub Pages
1. Create a new public repo, push `index.html` to the root
2. Settings → Pages → Source: `main` branch, root
3. Add a `CNAME` file with one line: `samuelhan.com`
4. Configure DNS (CNAME record pointing at `<username>.github.io`)

## Editing

Search the file for `FILL IN` — those are the spots that need your content. Everything else (typography, layout, hover states, mobile responsiveness, OG tags, favicon) is done.

## Content checklist before launching

- [ ] Header lede: one or two sentences positioning yourself
- [ ] Now block: 2-4 sentences on what you're focused on right now (this is the most important section for fellowship readers)
- [ ] About: 2-3 paragraph personal bio
- [ ] Experience entries: at least 2-3 roles with dates
- [ ] Education: degree details
- [ ] Writing & Projects: 3-5 links to essays / repos / talks
- [ ] Contact: email + any socials you use
- [ ] Update the `Last updated` date in the footer

## Design notes

- Body type: Charter (system serif). Falls back gracefully through Iowan Old Style → Palatino → Georgia.
- One accent colour (gold-dark, matches Top Uni brand) used only for hover states + the Now-block left border.
- Single column at 640px max width. Reads like prose, not a brochure.
- All system fonts — no web font load delay, page is interactive in <100ms on a fast connection.
