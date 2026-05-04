// topuni-bot
//
// Telegram webhook → AI customer-service / sales bot.
//
// Receives updates from Telegram, classifies intent (greeting vs general
// question), generates a response via the shared AI gateway grounded
// in TopUni's pricing/offerings/FAQ knowledge base, and posts the reply
// back through the Bot API. Non-streaming — Telegram doesn't stream;
// it just wants one final message back.
//
// Why this exists: TopUni's CIS audience lives in Telegram; sales/CS
// questions arrive there constantly and a real human can't answer at
// 3am. This bot fields the routine ones (pricing, what we do, refund
// policy, how to start) and tells callers when to escalate to a human.
//
// Privacy: incoming messages are NOT persisted. Each request is
// stateless; the bot doesn't remember prior conversations across
// runs. (We can add a chat-history table later if useful.)
//
// Cost: ~$0.0008/message (flash tier). 1000 messages/day = $0.80/day cap.
//
// ── Setup (user-side) ────────────────────────────────────────────────
//   1. Create a bot with @BotFather → copy the token
//   2. Add Supabase function secrets:
//        TELEGRAM_BOT_TOKEN  = <bot token>
//        TELEGRAM_WEBHOOK_SECRET = <any random string>
//        (AI provider creds already configured per ai-gateway.ts)
//   3. After deploy, register the webhook (one-time):
//        curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//          -d "url=https://<project>.supabase.co/functions/v1/topuni-bot" \
//          -d "secret_token=<WEBHOOK_SECRET>"
//   4. Verify: curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
// ─────────────────────────────────────────────────────────────────────

import { chatCompletions } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ── KNOWLEDGE BASE ───────────────────────────────────────────────────
   Single source of truth the bot answers from. Edit here when product
   facts change. Keep concise — every token costs latency + $. */
const TOPUNI_KB = `
# TopUni — what it is
TopUni is an AI-driven admissions strategy platform for international
students applying to top universities and scholarships. Founded by Yale,
Cambridge, Harvard, and Tsinghua alumni who've been on both sides of the
admissions table.

# Core products (all included in one membership)
- **TopUni AI** (free intake) — Seven quick questions about scores, story,
  goals. Returns a personalized admissions pathway in 60 seconds.
- **Discover** — 215+ scholarships ranked against the student's profile.
  Per-program strategy notes, deadline tracking, application pipeline,
  match-score breakdowns. The full database with country/level/field/
  funding filters.
- **Academy** — Live monthly workshops with admitted alumni founders.
  Admitted-essay library, country guides, application timelines.
  Recordings yours forever once you join.

# Pricing
- $39/month — full access to TopUni AI, Discover, Academy, and the
  monthly live workshops.
- Founding cohort discount available with a promo code at checkout.
- 30-day money-back guarantee. Cancel anytime. Stripe-secure payment.
- Free intake (TopUni AI) requires no card.

# Who it's for
- High-school seniors and university students applying to scholarships
  / programs abroad
- Strong fit: students from Central Asia, South Asia, Africa, the
  Middle East, Latin America, and East Asia. The platform is fully
  available in Russian and English.
- Use cases: undergraduate admission, master's, PhD, fellowships,
  research scholarships.

# Common questions
- "Do I need to upload my transcript?" — No transcript upload required.
  We work from the seven-question intake.
- "How long does it take?" — TopUni AI plan: 60 seconds. Discover
  ranks: instant once profile is filled. Workshops: monthly.
- "Is this consulting?" — No, it's a software platform. The cost
  difference vs. traditional consultants ($5k–$50k) is intentional —
  we're the software layer.
- "How is matching done?" — Combination of profile-fit scoring (GPA,
  IELTS, nationality, field, level) + semantic match against the
  scholarship's stated criteria. Score 85+ means strong fit.
- "Refund?" — 30 days, full refund, no questions.

# Team (humans behind it)
- Samuel Han — Founder & CEO (Yale)
- Nurzada Abdivalieva — Co-Founder (Tsinghua, Cambridge)
- Josh Hughes — Lead Consultant (Harvard)
- Aigul Abdoubaetova — Senior Advisor (Ex-OSCE Academy)

# Links the bot can share
- Pricing: https://topuni.kg/pricing
- Discover: https://topuni.kg/discover
- TopUni AI: https://topuni.kg/topuni-ai
- Academy: https://topuni.kg/academy
- Team: https://topuni.kg/team

# Escalation
If a question is about a SPECIFIC scholarship case (eligibility for an
edge case, deadline conflicts), an account-level issue (payment failed,
forgot password, refund), or a partnership / press / hiring inquiry —
say "I'll route this to the team — please email hello@topuni.com or
DM @top_uni_consulting on Instagram and we'll respond within 24 hours."
`;

const SYSTEM_PROMPT = `
You are the TopUni customer-service / sales assistant on Telegram.

Your job: answer questions about TopUni clearly and warmly using the
KNOWLEDGE BASE below. Be helpful and concise — Telegram messages get
read on phones, so prefer short paragraphs and bullet points.

VOICE
- Direct, warm, slightly professional. Not stiff. Not chatbot-cheesy.
- No "Great question!" / "I hope this helps!" / "Let me know if you
  have any other questions!" filler. Just answer.
- Sound like a smart Yale/Cambridge friend who happens to know
  admissions, not like a corporate FAQ.
- One short greeting on first contact (something like "Hey! Happy to
  help.") then move directly to the answer.

RULES
- Only state facts that are in the KNOWLEDGE BASE. If you don't know,
  say so and offer the escalation path (email or Instagram DM).
- Never invent prices, deadlines, refund terms, or specific scholarship
  details that aren't in the KB.
- For specific case questions ("am I eligible for X scholarship",
  "my IELTS is Y, will I get into Z"), explain that this is exactly
  what TopUni AI / Discover are built for — give the link and invite
  them to try the free intake.
- Match the user's language: reply in Russian if they wrote Russian,
  English if English. Brand names (TopUni, Discover, Academy, TopUni
  AI) stay in English.
- Keep responses under 6 sentences unless the user asks for detail.
- Use Telegram-friendly formatting (plain text + line breaks). Don't
  use markdown asterisks for bold; Telegram won't render them.

KNOWLEDGE BASE
${TOPUNI_KB}
`.trim();

/* ── Telegram update shape (only what we use) ─────────────────────── */
interface TgMessage {
  message_id: number;
  from?: { id: number; first_name?: string; username?: string };
  chat: { id: number };
  text?: string;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
}

async function sendMessage(token: string, chatId: number, text: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      // Telegram clients render preview-cards for links inside messages;
      // suppress that to keep replies tight.
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    console.error(`[topuni-bot] sendMessage failed ${r.status}: ${body}`);
  }
}

async function generateReply(userText: string, fromName?: string): Promise<string> {
  const greeting = fromName ? `(speaking with ${fromName})` : "";
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT + (greeting ? `\n\n${greeting}` : "") },
    { role: "user", content: userText },
  ];

  const resp = await chatCompletions({ tier: "flash", messages, stream: false });
  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`[topuni-bot] LLM error ${resp.status}: ${errBody.slice(0, 400)}`);
    throw new Error(`LLM ${resp.status}`);
  }
  const data = await resp.json();

  // Both shapes (OpenAI-compat and Anthropic translated): try OpenAI first.
  // OpenAI: data.choices[0].message.content
  // Anthropic: data.content[0].text
  let text: string | undefined =
    data?.choices?.[0]?.message?.content ??
    (Array.isArray(data?.content) ? data.content.find((c: { type: string; text?: string }) => c.type === "text")?.text : undefined);

  if (!text || typeof text !== "string") {
    console.warn(`[topuni-bot] empty LLM response shape: ${JSON.stringify(data).slice(0, 300)}`);
    text = "Sorry — I'm having a hiccup right now. Try again in a moment, or email hello@topuni.com and we'll respond within 24 hours.";
  }
  return text.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TOKEN) return json(500, { error: "TELEGRAM_BOT_TOKEN not configured" });

  // Verify the webhook came from Telegram. When we set the webhook with
  // a secret_token, Telegram sends it back in this header on every
  // request. Mismatch = silently ignore (don't leak that we noticed).
  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (expectedSecret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expectedSecret) {
      console.warn("[topuni-bot] secret-token mismatch — ignoring webhook");
      return json(200, { ok: true }); // 200 so Telegram doesn't retry
    }
  }

  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return json(200, { ok: true });
  }

  const msg = update.message ?? update.edited_message;
  if (!msg || !msg.text || !msg.chat?.id) {
    return json(200, { ok: true }); // non-text updates ignored
  }

  // Slash commands handled inline (don't burn an LLM call on /start)
  if (msg.text.startsWith("/start")) {
    await sendMessage(
      TOKEN,
      msg.chat.id,
      "Hey! I'm the TopUni assistant. I can answer questions about pricing, how the platform works, eligibility, refunds, and more.\n\nAsk me anything — or try our free intake at https://topuni.kg/topuni-ai to see what your personalized admissions plan looks like.",
    );
    return json(200, { ok: true });
  }
  if (msg.text.startsWith("/help")) {
    await sendMessage(
      TOKEN,
      msg.chat.id,
      "Ask me about:\n• Pricing & founding-cohort discount\n• What's included (TopUni AI, Discover, Academy)\n• Refunds & guarantees\n• Eligibility / who it's for\n• How matching works\n\nFor specific account issues or partnerships, email hello@topuni.com.",
    );
    return json(200, { ok: true });
  }

  try {
    const reply = await generateReply(msg.text, msg.from?.first_name);
    await sendMessage(TOKEN, msg.chat.id, reply);
  } catch (e) {
    console.error("[topuni-bot] handler error:", e);
    await sendMessage(
      TOKEN,
      msg.chat.id,
      "Hit a snag answering that — please try again, or reach the team at hello@topuni.com.",
    );
  }

  return json(200, { ok: true });
});
