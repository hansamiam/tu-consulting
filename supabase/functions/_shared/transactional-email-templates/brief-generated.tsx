/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// 2026-05-29 — rewritten for v2 dossier. v1 archetype / scholarship-
// matches / Monday move framing dropped. New "what's inside" mirrors
// the Play / Blindspot / Pivot structure the live report ships.

interface Props {
  /** First name if known. Falls back to a neutral greeting. */
  firstName?: string
  /** Persistent strategy URL — /topuni-ai/r/:id(?t=<token>) */
  briefUrl: string
  /** "ru" → render the Russian variant, anything else → English. */
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    kicker: 'TopUni · Strategy report',
    greetingNamed: (n: string) => `${n}, your strategy is ready.`,
    greetingNeutral: 'Your strategy is ready.',
    subline: 'We diagnosed your fit, named the blindspot, and mapped your pivot.',
    previewFallback: 'Your TopUni strategy report is ready to read.',
    openBrief: 'Get your strategy',
    insideTitle: "What's inside",
    insideRows: [
      ['Readiness Score', 'where you stand across 5 axes, honest about gaps.'],
      ['Unique Edge', 'the specific assets that win you programs.'],
      ['Blindspot', 'the single threshold or credential to cross.'],
      ['Target Opportunity', 'the strategic category to aim for — not a school list.'],
    ] as const,
    saveLink: 'This link is yours. Save it — your strategy stays accessible as long as you have an account.',
    teamSignoff: '— TopUni team',
    htmlLang: 'en',
  },
  ru: {
    kicker: 'TopUni · Стратегический отчёт',
    greetingNamed: (n: string) => `${n}, ваша стратегия готова.`,
    greetingNeutral: 'Ваша стратегия готова.',
    subline: 'Мы диагностировали ваш fit, назвали blindspot и обозначили pivot.',
    previewFallback: 'Ваш стратегический отчёт TopUni готов к прочтению.',
    openBrief: 'Получить стратегию',
    insideTitle: 'Что внутри',
    insideRows: [
      ['Уровень готовности', 'где вы находитесь по 5 осям — честно о пробелах.'],
      ['Unique Edge', 'конкретные активы, которые выигрывают программы.'],
      ['Blindspot', 'один порог или credential, который нужно преодолеть.'],
      ['Target Opportunity', 'стратегическая категория — не список школ.'],
    ] as const,
    saveLink: 'Эта ссылка — ваша. Сохраните её — стратегия остаётся доступной, пока у вас есть аккаунт.',
    teamSignoff: '— Команда TopUni',
    htmlLang: 'ru',
  },
} as const

const BriefGeneratedEmail = ({
  firstName,
  briefUrl,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const greeting = firstName ? c.greetingNamed(firstName) : c.greetingNeutral

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head>
        {/* Match website typography (tailwind.config: heading=Montserrat,
            sans=Inter). Apple Mail + Gmail web load these reliably; Outlook
            falls through to the system-font fallback chain on the style
            objects below. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap"
        />
      </Head>
      <Preview>{c.previewFallback}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>{c.kicker}</Text>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={subline}>{c.subline}</Text>

          <Section style={btnWrap}>
            <Button href={briefUrl} style={primaryBtn}>
              {c.openBrief}
            </Button>
          </Section>

          <Hr style={hr} />
          <Heading style={h3}>{c.insideTitle}</Heading>
          <Text style={text}>
            {c.insideRows.map(([label, body], i) => (
              <React.Fragment key={i}>
                <strong>{label}</strong> — {body}<br />
              </React.Fragment>
            ))}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>{c.saveLink}</Text>
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BriefGeneratedEmail,
  subject: ((data: Record<string, any>) => {
    const isRu = data.language === 'ru'
    const name = data.firstName || ''
    if (isRu) {
      return name ? `${name}, ваша стратегия готова` : 'Ваша стратегия готова'
    }
    return name ? `${name}, your strategy is ready` : 'Your TopUni strategy is ready'
  }),
  displayName: 'Strategy ready — open it now',
  previewData: {
    firstName: 'Aizada',
    briefUrl: 'https://topuni.org/topuni-ai/r/x7k2p9q4?t=abc123',
    language: 'en',
  },
} satisfies TemplateEntry

// Email styles — mirror the website's brand:
//   - heading: Montserrat (with Helvetica/Arial fallback for email clients
//     that don't load web fonts)
//   - body: Inter (same fallback chain)
//   - colors: brand-navy (#0a2540) + gold-dark (#b8860b) + slate body
// Email clients that ignore web fonts (Outlook, some corporate clients)
// fall back to system sans-serif — still clean, just not the branded
// Montserrat headline weight.
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const FONT_HEADING = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const main = { backgroundColor: '#f6f5f1', fontFamily: FONT_BODY }
const container = { padding: '32px 28px', maxWidth: '560px', backgroundColor: '#ffffff', borderRadius: '8px' }
const h1 = { fontFamily: FONT_HEADING, fontSize: '26px', fontWeight: 700, color: '#0a2540', margin: '4px 0 8px', lineHeight: '1.22', letterSpacing: '-0.01em' }
const h3 = { fontFamily: FONT_HEADING, fontSize: '12px', fontWeight: 700, color: '#0a2540', margin: '4px 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.14em' }
const subline = { fontFamily: FONT_BODY, fontSize: '15px', color: '#5d6b7a', margin: '0 0 22px', lineHeight: '1.55' }
const kicker = { fontFamily: FONT_HEADING, fontSize: '11px', fontWeight: 700, color: '#b8860b', textTransform: 'uppercase' as const, letterSpacing: '0.22em', margin: '0 0 6px' }
const text = { fontFamily: FONT_BODY, fontSize: '14px', color: '#3c4858', lineHeight: '1.7', margin: '0 0 8px' }
const btnWrap = { textAlign: 'center' as const, margin: '8px 0 4px' }
const primaryBtn = { fontFamily: FONT_HEADING, backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.02em' }
const hr = { borderColor: '#e4e1d6', margin: '24px 0' }
const footer = { fontFamily: FONT_BODY, fontSize: '12px', color: '#8898aa', margin: '6px 0' }
