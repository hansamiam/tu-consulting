/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  reportUrl: string
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'Your Top Uni strategy is ready to read.',
    headingNamed: (n: string) => `${n}, your strategy is ready.`,
    headingNeutral: 'Your Top Uni strategy is ready.',
    body: 'Open it now — your personalized scholarship strategy, scholarship shortlist, and first action step are inside.',
    cta: 'Read my strategy',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: '— The Top Uni Team',
    subject: (n: string) => n ? `${n}, your Top Uni strategy is ready` : 'Your Top Uni strategy is ready',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ваша стратегия Top Uni готова к прочтению.',
    headingNamed: (n: string) => `${n}, ваша стратегия готова.`,
    headingNeutral: 'Ваша стратегия Top Uni готова.',
    body: 'Откройте — внутри персональная стратегия стипендий, шорт-лист и первый шаг.',
    cta: 'Читать стратегию',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: '— Команда Top Uni',
    subject: (n: string) => n ? `${n}, ваша стратегия Top Uni готова` : 'Ваша стратегия Top Uni готова',
  },
} as const

const StrategyReportReadyEmail = ({ name, reportUrl, unsubscribeUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.body}</Text>
          <Button href={reportUrl} style={primaryBtn}>{c.cta}</Button>
          <Hr style={hr} />
          {unsubscribeUrl && (
            <Text style={footer}>
              {c.footerPause}<a href={unsubscribeUrl} style={subtleLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
            </Text>
          )}
          <Text style={footer}>{c.signoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: StrategyReportReadyEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Strategy report ready',
  previewData: {
    name: 'Aizada',
    reportUrl: 'https://topuni.org/topuni-ai',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
