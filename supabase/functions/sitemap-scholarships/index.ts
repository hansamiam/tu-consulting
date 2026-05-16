// sitemap-scholarships
//
// Returns a fresh XML sitemap of every verified-or-stale scholarship in
// the database, one <url> entry per row. Search engines crawl this to
// discover all 200+ /scholarships/:id pages without us having to
// regenerate the static public/sitemap.xml every time the catalog grows.
//
// Read-only · public · cached at the edge for 1 hour.
//
// Endpoint registered via the Vercel rewrite in vercel.json so the
// canonical URL is https://topuni.org/sitemap-scholarships.xml — that's
// what robots.txt advertises.

import { createServiceClient } from "../_shared/clients.ts";

const SITE = "https://topuni.org";

const xmlHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
};

const escape = (s: string) =>
  s.replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;")
   .replace(/'/g, "&apos;");

Deno.serve(async () => {
  const supa = createServiceClient();

  // Match the public detail-page read filter exactly: verified, stale,
  // pending, or NULL — anything except 'broken'. Pre-fix the sitemap
  // only emitted verified+stale, but ScholarshipDetail.tsx renders
  // pending rows too (auto-published at confidence ≥0.78 with the
  // "Always confirm deadlines and amounts" disclaimer). That meant
  // ~1/3 of the catalog had live, user-visible detail pages that
  // Google never crawled — pure SEO leak.
  //
  // Pending rows get a slightly lower priority (0.5) so Google focuses
  // its crawl budget on the already-verified rows first, but they ARE
  // in the index so lastmod updates from the verify cron get picked up.
  const { data: rows, error } = await supa
    .from("scholarships")
    .select("scholarship_id, last_verified_at, created_at, verification_status")
    .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
    .limit(5000);

  if (error) {
    console.error("[sitemap-scholarships] query failed", error);
    return new Response(`<!-- query failed: ${escape(error.message)} -->`, {
      status: 500, headers: xmlHeaders,
    });
  }

  // Each scholarship gets two indexable URLs — EN at /scholarships/:id,
  // RU at /scholarships/:id/ru. The pages share data + structure but
  // render Russian section titles + chrome when language="ru". Include
  // both so search engines crawl the Russian variants and we double our
  // SEO surface for Russian-language admissions queries.
  const urls = (rows ?? []).flatMap((r) => {
    const lastmod = r.last_verified_at ?? r.created_at ?? null;
    const lastmodTag = lastmod ? `<lastmod>${escape(new Date(lastmod).toISOString().slice(0, 10))}</lastmod>` : "";
    const id = escape(r.scholarship_id);
    // Priority schedule: verified > stale > pending/NULL. Helps Google
    // spend its crawl budget on the trust-confirmed rows first.
    const status = r.verification_status ?? "pending";
    const prioEn = status === "verified" ? 0.7 : status === "stale" ? 0.6 : 0.5;
    const prioRu = Math.max(0.4, prioEn - 0.1);
    return [
      `  <url><loc>${SITE}/scholarships/${id}</loc>${lastmodTag}<changefreq>weekly</changefreq><priority>${prioEn}</priority></url>`,
      `  <url><loc>${SITE}/scholarships/${id}/ru</loc>${lastmodTag}<changefreq>weekly</changefreq><priority>${prioRu}</priority></url>`,
    ];
  });

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") + (urls.length ? "\n" : "") +
    `</urlset>\n`;

  return new Response(body, { status: 200, headers: xmlHeaders });
});
