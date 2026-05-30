/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  wizardUrl?: string
  calUrl?: string
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'Still thinking it over? One concrete use case inside.',
    headingNamed: (n: string) => `${n}, still thinking it over?`,
    headingNeutral: 'Still thinking it over?',
    body: "Most students use Top Uni for one of two things: building a scholarship shortlist they didn't know existed, or pressure-testing a list they already have. Either takes under 10 minutes with the wizard.",
    calNote: "If you'd rather talk through your situation first, book a free 15-min call — no pitch, just help.",
    ctaWizard: 'Open the wizard',
    ctaCal: 'Book a 15-min call',
    footerFinal: 'This is the last email in this sequence.',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: '— Sam @ Top Uni',
    subject: (n: string) => n ? `${n}, still thinking it over?` : 'Still thinking it over?',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ещё думаете? Один конкретный сценарий внутри.',
    headingNamed: (n: string) => `${n}, ещё думаете?`,
    headingNeutral: 'Ещё думаете?',
    body: 'Большинство студентов используют Top Uni для одного из двух: найти стипендии, о которых не знали, или проверить список, который уже есть. С мастером — менее 10 минут.',
    calNote: 'Если сначала хотите поговорить — запишитесь на 15-минутный звонок. Без питча, просто помощь.',
    ctaWizard: 'Открыть мастер',
    ctaCal: 'Записаться на звонок',
    footerFinal: 'Это последнее письмо в этой серии.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: '— Сэм @ Top Uni',
    subject: (n: string) => n ? `${n}, ещё думаете?` : 'Ещё думаете?',
  },
} as const

const DripDay14Email = ({ name, wizardUrl = 'https://topuni.org/topuni-ai', calUrl, unsubscribeUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.body}</Text>
          <Button href={wizardUrl} style={primaryBtn}>{c.ctaWizard}</Button>
          {calUrl && (
            <>
              <Text style={calNote}>{c.calNote}</Text>
              <Button href={calUrl} style={secondaryBtn}>{c.ctaCal}</Button>
            </>
          )}
          <Hr style={hr} />
          <Text style={footer}>{c.footerFinal}</Text>
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
  component: DripDay14Email,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Drip · day 14 final nudge',
  previewData: {
    name: 'Aizada',
    wizardUrl: 'https://topuni.org/topuni-ai',
    calUrl: 'https://cal.com/topuni/15min',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const calNote = { fontSize: '14px', color: '#3c4858', lineHeight: '1.5', margin: '16px 0 10px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const secondaryBtn = { backgroundColor: '#ffffff', color: '#0a2540', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #d0d7e0', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
