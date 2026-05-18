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
}

export interface FirecrawlScrapeResult {
  markdown: string;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
    sourceURL?: string;
  };
}

export async function firecrawlScrape(opts: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set in edge function secrets");

  const ctrl = new AbortController();
  // 2026-05-18: bumped 30s → 45s after observing 12 "signal aborted"
  // failures/4h on slow government sites (moet.gov.vn, ocsc.go.th,
  // icetex.gov.co — all hung at 30,062–30,230 ms exactly, the old
  // ceiling). With flash-tier LLM calls now ~5s instead of pro's 15s,
  // we have headroom against the 60s edge function wall: 45s scrape +
  // 5–10s LLM + 5s DB ≈ 55–60s budget.
  const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? 45_000);

  try {
    const resp = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: opts.url,
        formats: ["markdown"],
        onlyMainContent: opts.onlyMainContent ?? true,
        waitFor: opts.waitFor ?? 0,
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
      metadata: data.data?.metadata,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Approximate cost of one scrape in USD — used for run-level cost tracking. */
export const FIRECRAWL_COST_PER_SCRAPE_USD = 0.001;
