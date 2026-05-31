// Shared visual brand tokens for transactional emails.
//
// Imported by all templates so a single edit here updates every email.
// Keep the palette small — Gmail / Outlook / Apple Mail render <style>
// inconsistently, so each template inlines these directly.

export const brand = {
  // background + surface
  bg: '#FAF7F2',           // warm cream page background
  cardBg: '#FFFFFF',       // white inner card
  cardBorder: '#EAE4D8',   // soft taupe border
  divider: '#E6E0D2',      // subtle divider line

  // ink
  ink: '#0A1F44',          // deep navy — headings + primary CTA
  inkBody: '#2E3A55',      // body text
  muted: '#8B95A8',        // footer + secondary
  link: '#0A1F44',         // inline links — same as ink for elegance

  // accent
  gold: '#B89540',         // brand gold (CTA / accent strokes)
  goldDark: '#94762E',     // hover / pressed
  goldLight: '#E8D8A8',    // subtle gold tint
} as const

// Inline style fragments — each template imports + spreads.
// Keep them as plain objects so `satisfies React.CSSProperties` works.

export const styles = {
  page: {
    backgroundColor: brand.bg,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    padding: '32px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  masthead: {
    textAlign: 'center' as const,
    paddingBottom: '28px',
  },
  wordmark: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: '22px',
    letterSpacing: '0.22em',
    fontWeight: 'bold' as const,
    color: brand.ink,
    margin: 0,
    textTransform: 'uppercase' as const,
  },
  tagline: {
    fontSize: '10px',
    letterSpacing: '0.18em',
    color: brand.gold,
    margin: '6px 0 0',
    textTransform: 'uppercase' as const,
  },
  card: {
    backgroundColor: brand.cardBg,
    border: `1px solid ${brand.cardBorder}`,
    borderRadius: '10px',
    padding: '40px 36px',
    boxShadow: '0 1px 2px rgba(10, 31, 68, 0.04)',
  },
  h1: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: '26px',
    fontWeight: 'normal' as const,
    color: brand.ink,
    margin: '0 0 16px',
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
  },
  goldRule: {
    width: '40px',
    height: '2px',
    backgroundColor: brand.gold,
    border: 'none',
    margin: '0 0 22px',
  },
  body: {
    fontSize: '15px',
    color: brand.inkBody,
    lineHeight: '1.7',
    margin: '0 0 24px',
  },
  bodySmall: {
    fontSize: '14px',
    color: brand.inkBody,
    lineHeight: '1.6',
    margin: '0 0 18px',
  },
  ctaWrap: {
    margin: '8px 0 4px',
  },
  ctaPrimary: {
    backgroundColor: brand.ink,
    color: '#FFFFFF',
    padding: '13px 28px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '0.02em',
  },
  ctaSecondary: {
    backgroundColor: '#FFFFFF',
    color: brand.ink,
    padding: '12px 26px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    display: 'inline-block',
    border: `1px solid ${brand.cardBorder}`,
    letterSpacing: '0.02em',
  },
  divider: {
    border: 'none',
    borderTop: `1px solid ${brand.divider}`,
    margin: '32px 0 20px',
  },
  footer: {
    paddingTop: '24px',
    textAlign: 'center' as const,
  },
  footerLine: {
    fontSize: '12px',
    color: brand.muted,
    lineHeight: '1.6',
    margin: '4px 0',
  },
  footerLink: {
    color: brand.muted,
    textDecoration: 'underline',
  },
  signoff: {
    fontSize: '14px',
    color: brand.inkBody,
    lineHeight: '1.6',
    margin: '24px 0 0',
    fontStyle: 'italic' as const,
  },
  noteHighlight: {
    backgroundColor: '#F8F2E0',
    borderLeft: `3px solid ${brand.gold}`,
    padding: '14px 18px',
    margin: '12px 0 24px',
    fontSize: '14px',
    color: brand.inkBody,
    lineHeight: '1.6',
  },
} as const
