/**
 * ShareAsset — the v7 "Wrapped-Bold" share-card render + capture helpers.
 *
 * The v7 spec (2026-05-22) calls for two distinct visual treatments:
 *   - In-app: editorial / magazine. The render we already use in
 *     BriefMinimal's CardStack (serif headlines, neutral palette,
 *     prose body). Optimized for reading.
 *   - Share asset: Wrapped-Bold. Big sans-serif display type,
 *     saturated color background per archetype, brand mark + URL
 *     footer. Optimized for IG Story screenshot share — meant to be
 *     a single quotable artifact at thumbnail size.
 *
 * This file provides the Wrapped-Bold layout for each section type
 * plus a helper that captures any rendered Wrapped-Bold card to PNG
 * via html-to-image. The capture is client-side (no server PNG
 * pipeline needed), zero-cost, and supports the Web Share API with
 * file attachment on iOS Safari + Chrome on Android — the platforms
 * that matter for Bishkek/Almaty mobile-first users.
 *
 * The "deep link directly into the IG Story camera with the asset
 * pre-attached" version requires a registered Facebook app ID +
 * the instagram-stories:// URL scheme on iOS — that's still
 * deferred. This file's `shareCardAsImage` calls navigator.share()
 * with the File which on iOS Safari opens a native share sheet that
 * INCLUDES "Instagram Stories" as a destination, so the practical
 * UX is one tap → IG sheet → share — close enough to the spec's
 * intent to ship now.
 */

import React from "react";
import { toPng } from "html-to-image";
import type {
  ArchetypePayload,
  CountryBucket,
  EssaySeed,
  MondayMove,
  WhereYouStandPayload,
} from "./types";

/** Wrapped-Bold canvas dimensions. 1080×1920 is the IG Story-native
 *  aspect; the same image previews well on TikTok, Twitter Cards,
 *  WhatsApp status, and pinned to Pinterest. Single source of truth
 *  for the renderer + the html-to-image capture. */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

/** Common card chrome — color background + brand mark footer + URL.
 *  The inner content slot is what each section-specific variant
 *  fills in. */
interface WrappedBoldFrameProps {
  /** Saturated background color hex. Defaults to a brand-neutral
   *  warm gray when no archetype color is available (e.g., for
   *  legacy schema-2 cached briefs that never went through the
   *  pre-plan). */
  color?: string;
  /** Kicker text shown at the top — "01 · WHERE YOU STAND" style. */
  kicker?: string;
  children?: React.ReactNode;
}

const WrappedBoldFrame: React.FC<WrappedBoldFrameProps> = ({ color = "#3A5D6E", kicker, children }) => {
  return (
    <div
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        background: `linear-gradient(180deg, ${color} 0%, ${color}E0 60%, ${color}C0 100%)`,
        color: "#FFFFFF",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        padding: "120px 90px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Brand mark — top */}
      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.32em",
          fontWeight: 600,
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        TopUni AI
      </div>

      {/* Kicker */}
      {kicker && (
        <div
          style={{
            marginTop: 72,
            fontSize: 28,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontWeight: 500,
            opacity: 0.75,
          }}
        >
          {kicker}
        </div>
      )}

      {/* Slot for section-specific body */}
      <div style={{ flex: 1, marginTop: 56, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {children}
      </div>

      {/* URL footer */}
      <div
        style={{
          fontSize: 28,
          letterSpacing: "0.24em",
          fontWeight: 500,
          textTransform: "uppercase",
          opacity: 0.85,
          textAlign: "center",
        }}
      >
        topuni.kz/ai
      </div>
    </div>
  );
};

// ─── Section-specific Wrapped-Bold variants ──────────────────────

export const ArchetypeShareCard: React.FC<{ payload: ArchetypePayload }> = ({ payload }) => (
  <WrappedBoldFrame color={payload.color} kicker="You are">
    <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05, textTransform: "uppercase" }}>
      {payload.name}
    </div>
    {payload.tagline && (
      <div
        style={{
          marginTop: 56,
          fontSize: 40,
          fontWeight: 400,
          fontStyle: "italic",
          lineHeight: 1.3,
          opacity: 0.95,
          maxWidth: 720,
        }}
      >
        {payload.tagline}
      </div>
    )}
  </WrappedBoldFrame>
);

interface SectionShareProps {
  color?: string;
}

export const WhereYouStandShareCard: React.FC<SectionShareProps & { payload: WhereYouStandPayload }> = ({
  color,
  payload,
}) => (
  <WrappedBoldFrame color={color} kicker={payload.kicker ?? "01 · Where you stand"}>
    {payload.headline && (
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        “{payload.headline}”
      </div>
    )}
    {payload.pullquote && (
      <div style={{ marginTop: 56, fontSize: 36, fontWeight: 400, fontStyle: "italic", lineHeight: 1.35, opacity: 0.92 }}>
        {payload.pullquote}
      </div>
    )}
  </WrappedBoldFrame>
);

export const WhereYouBelongShareCard: React.FC<SectionShareProps & { buckets: CountryBucket[] }> = ({
  color,
  buckets,
}) => (
  <WrappedBoldFrame color={color} kicker="02 · Where you belong">
    <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 64 }}>
      Where you can end up:
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
      {buckets.slice(0, 3).map((b, i) => (
        <div key={`${b.country}-${i}`}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {b.country}
            {b.cities && (
              <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 16, fontSize: 32 }}>
                — {b.cities}
              </span>
            )}
          </div>
          <div style={{ marginTop: 16, fontSize: 28, opacity: 0.9, lineHeight: 1.4 }}>
            {b.schools.slice(0, 3).map((s) => s.name).join(" · ")}
          </div>
        </div>
      ))}
    </div>
  </WrappedBoldFrame>
);

export const EssaySeedShareCard: React.FC<SectionShareProps & { seed: EssaySeed }> = ({ color, seed }) => (
  <WrappedBoldFrame color={color} kicker="03 · The essay only you can write">
    {seed.title && (
      <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 56 }}>
        {seed.title}
      </div>
    )}
    {seed.closer && (
      <div style={{ fontSize: 38, fontWeight: 400, fontStyle: "italic", lineHeight: 1.3, opacity: 0.95 }}>
        “{seed.closer}”
      </div>
    )}
  </WrappedBoldFrame>
);

export const MondayMoveShareCard: React.FC<SectionShareProps & { move: MondayMove }> = ({ color, move }) => (
  <WrappedBoldFrame color={color} kicker="06 · Your Monday move">
    {move.headline && (
      <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {move.headline}
      </div>
    )}
    {move.closer && (
      <div style={{ marginTop: 64, fontSize: 36, fontWeight: 400, fontStyle: "italic", lineHeight: 1.35, opacity: 0.92 }}>
        {move.closer}
      </div>
    )}
  </WrappedBoldFrame>
);

// ─── Capture + share helpers ─────────────────────────────────────

/** Capture a DOM element to a PNG data URL via html-to-image. The
 *  element should be the Wrapped-Bold variant of a card, mounted
 *  off-screen at full 1080×1920 size. Returns null on failure. */
export async function captureCardAsPng(el: HTMLElement): Promise<string | null> {
  try {
    // html-to-image's toPng samples the element at the device-pixel
    // ratio. We pin to canvas dimensions so the output is always
    // 1080×1920 regardless of viewport.
    return await toPng(el, {
      pixelRatio: 1,
      cacheBust: true,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      style: {
        transform: "scale(1)",
        transformOrigin: "top left",
      },
    });
  } catch (err) {
    console.warn("[share-asset] capture failed:", (err as Error).message);
    return null;
  }
}

interface ShareCardOptions {
  /** Suggested message text for the share sheet. */
  text?: string;
  /** Suggested title for the share sheet. */
  title?: string;
  /** The current page URL (so the share also carries a link). */
  url?: string;
  /** Filename for the PNG attachment. */
  filename?: string;
}

/** Capture a Wrapped-Bold card to PNG and share it via the platform's
 *  native share sheet. Returns true if the share completed (or the
 *  user cancelled gracefully), false if no share path was available
 *  and the caller should fall back to the URL-only path. */
export async function shareCardAsImage(
  el: HTMLElement,
  opts: ShareCardOptions = {},
): Promise<boolean> {
  const dataUrl = await captureCardAsPng(el);
  if (!dataUrl) return false;

  // Convert data URL to Blob → File for the Web Share API.
  let file: File | null = null;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    file = new File([blob], opts.filename ?? "topuni-ai-brief.png", { type: "image/png" });
  } catch (err) {
    console.warn("[share-asset] file conversion failed:", (err as Error).message);
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  // Best path: Web Share API WITH file attachment. iOS Safari +
  // Chrome on Android support this. The share sheet that opens
  // includes "Instagram Stories" as a target on iOS.
  if (file && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        files: [file],
      });
      return true;
    } catch (err) {
      // User cancelled — that's a successful "share path completed".
      if ((err as Error).name === "AbortError") return true;
      console.warn("[share-asset] navigator.share with file threw:", (err as Error).message);
    }
  }

  // Fallback A: Web Share API WITHOUT files. Some browsers support
  // text+url shares but not file attachments. The student still gets
  // a share sheet — just no embedded image.
  if (nav.share) {
    try {
      await nav.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") return true;
    }
  }

  // Fallback B: trigger a download of the PNG so the student can
  // manually share it. On desktop Firefox + older browsers this is
  // the available path.
  try {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = opts.filename ?? "topuni-ai-brief.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.warn("[share-asset] download fallback failed:", (err as Error).message);
  }

  return false;
}
