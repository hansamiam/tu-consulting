/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  wizardUrl?: string
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: "What's getting in the way of your scholarship strategy?",
    headingNamed: (n: string) => `${n}, quick question.`,
    headingNeutral: 'Quick question.',
    body: "You signed up for Top Uni last week but haven't run the wizard yet. What's blocking you? The wizard takes 4 minutes and the output is a concrete scholarship shortlist — not generic advice.",
    cta: 'Start the wizard',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: '— Sam @ Top Uni',
    subject: (n: string) => n ? `${n}, quick question about your application strategy` : 'Quick question about your application strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Что мешает начать работу над стратегией стипендий?',
    headingNamed: (n: string) => `${n}, быстрый вопрос.`,
    headingNeutral: 'Быстрый вопрос.',
    body: 'Вы зарегистрировались в Top Uni на прошлой неделе, но ещё не запустили мастер. Что мешает? Мастер занимает 4 минуты, результат — конкретный шорт-лист стипендий, без общих советов.',
    cta: 'Запустить мастер',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: '— Сэм @ Top Uni',
    subject: (n: string) => n ? `${n}, быстрый вопрос о вашей стратегии` : 'Быстрый вопрос о вашей стратегии',
  },
} as const

const DripDay7Email = ({ name, wizardUrl = 'https://topuni.org/topuni-ai', unsubscribeUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.body}</Text>
          <Button href={wizardUrl} style={primaryBtn}>{c.cta}</Button>
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
  component: DripDay7Email,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Drip · day 7 re-engagement',
  previewData: {
    name: 'Aizada',
    wizardUrl: 'https://topuni.org/topuni-ai',
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
