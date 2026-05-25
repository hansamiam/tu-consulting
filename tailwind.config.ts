import type { Config } from "tailwindcss";

/*
 * NAVY COLOR AUDIT — 2026-05-25
 *
 * Hardcoded hex found:
 *   - src/components/brief/HandoffBridge.tsx: archetypeColor = "#1A3B66" (default prop fallback)
 *     → This is the archetype-accent color, not the brand footer navy. Left as-is because
 *       it's a dynamic prop overridden per-archetype; it does not clash with the footer.
 *
 * Files using bg-primary / bg-[hsl(var(--primary))]:
 *   - src/components/Footer.tsx: bg-primary (THE canonical brand footer navy reference)
 *
 * Files using hsl(var(--navy-deep)) / hsl(var(--navy)) inline:
 *   - src/components/brief/BriefStory/BriefStory.tsx: bg-[hsl(var(--navy-deep))] (essay frame)
 *   - src/components/TopUniDashboard.tsx: bg-[hsl(var(--navy-deep))] (Open Discover CTA inline)
 *
 * TWO different navies confirmed:
 *   --primary:   210 58% 22%  ← footer "brand navy" (slightly brighter / more saturated)
 *   --navy-deep: 210 74% 13%  ← deep accent navy used in essay frame + CTA buttons (darker)
 *   --navy:      210 70% 20%  ← mid-tone navy (gradient overlays)
 *
 * The AcademyHookCta component does NOT use navy — it uses bg-muted/30.
 * The clash Samuel saw is --navy-deep CTAs (very dark) vs --primary footer (brighter navy).
 *
 * Resolution: unify all user-facing CTA navy to --primary (the footer reference).
 * The navy / navy-deep tokens remain for decorative gradients and shadows.
 * A new `brand-navy` alias is added pointing to --primary so components
 * can use bg-brand-navy and always match the footer.
 */

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        canvas: {
          DEFAULT: "hsl(var(--canvas))",
          soft: "hsl(var(--canvas-soft))",
        },
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          bright: "hsl(var(--primary-bright))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          deep: "hsl(var(--navy-deep))",
        },
        /* brand-navy: canonical brand navy — always matches the footer.
         * Maps to --primary so Open Discover CTAs, essay frames, and
         * the footer all resolve to the same rendered value. */
        "brand-navy": "hsl(var(--primary))",
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      backgroundImage: {
        'gradient-gold': 'var(--gradient-gold)',
        'gradient-overlay': 'var(--gradient-overlay)',
        'gradient-premium': 'var(--gradient-premium)',
        'gradient-canvas': 'var(--gradient-canvas)',
        'gradient-hero': 'var(--gradient-hero)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "breathe-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "breathe-glow": "breathe-glow 4s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
