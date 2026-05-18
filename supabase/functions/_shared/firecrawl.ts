/**
 * Firecrawl client — JS-rendering scrape with markdown output.
 *
 * Why Firecrawl: scholarship sites are a mix of static HTML and React-heavy
 * SPAs (DAAD, Eiffel, several university aid pages). Plain `fetch` misses
 * the JS-rendered content. Firecrawl handles render + captcha for $0.001
 * per page, which is cheaper than maintaining our own Playwright cluster.
 *
 * Free tier (500 credits/mo) covers ~16 sources at daily cadence — plenty
 * for the seed list. If we cap out we either upgrade ($16/mo for 3k credits)
 * or fall back to plain `fetch` for known-static sources.
 *
 * Auth env: FIRECRAWL_API_KEY (set in Supabase edge function secrets).
 */

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

export interface FirecrawlScrapeOptions {
  url: string;
  /** Strip nav/footer/sidebar so the LLM sees only the main content. Default true. */
  onlyMainContent?: boolean;
  /** ms to wait after page load before capturing (lets late JS render). Default 0. */
  waitFor?: number;
  /** Optional override of the standard timeout (ms). Default 45s. */
  timeout?: number;
  /** When true, also request rawHtml (rendered HTML including head meta).
   *  Used by enrich-cover-images-cron to scrape og:image off the
   *  post-JS-render head — Firecrawl's metadata.ogImage isn't reliable. */
  withRawHtml?: boolean;
}

export interface FirecrawlScrapeResult {
  markdown: string;
  /** Post-JS-render raw HTML when withRawHtml=true was requested. */
  rawHtml?: string;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
    sourceURL?: string;
    // Firecrawl sometimes populates these from the JS-rendered head, but
    // coverage is inconsistent — many sites end up with metadata.{} even
    // when og:image is present. For reliable og:image extraction, request
    // withRawHtml and parse the head yourself.
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterImage?: string;
  };
}

export async function firecrawlScrape(opts: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set in edge function secrets");

  const timeoutMs = opts.timeout ?? 45_000;
  const ctrl = new AbortController();
  // 2026-05-18 round 2: pass `timeout` to Firecrawl's REQUEST BODY in
  // addition to running our own AbortController. Pre-fix only the
  // AbortController was wired up, so Firecrawl used its internal 30s
  // default — every slow site (UN Youth Scholarships, UNAM, Grace
  // Hopper) hit Firecrawl's server-side 408 at ~30s and we never got
  // to use our 45s client budget. We now ask Firecrawl to wait
  // (timeoutMs - 2_000) ms before giving up; the local AbortController
  // is the secondary guard if the round-trip itself wedges.
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const resp = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: opts.url,
        formats: opts.withRawHtml ? ["markdown", "rawHtml"] : ["markdown"],
        onlyMainContent: opts.onlyMainContent ?? true,
        waitFor: opts.waitFor ?? 0,
        timeout: Math.max(timeoutMs - 2_000, 15_000),
      }),
      signal: ctrl.signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Firecrawl HTTP ${resp.status}: ${text.slice(0, 400)}`);
    }
    const data = await resp.json();
    if (!data.success) {
      throw new Error(`Firecrawl unsuccessful: ${JSON.stringify(data).slice(0, 400)}`);
    }

    return {
      markdown: data.data?.markdown ?? "",
      rawHtml: data.data?.rawHtml,
      metadata: data.data?.metadata,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Approximate cost of one scrape in USD — used for run-level cost tracking. */
export const FIRECRAWL_COST_PER_SCRAPE_USD = 0.001;
