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
    preview: 'One thing to do right now: start the 3-step wizard.',
    headingNamed: (n: string) => `Welcome, ${n}.`,
    headingNeutral: 'Welcome to Top Uni.',
    lead: 'Top Uni is a scholarship search engine and AI strategy tool for international students. Start the 3-step wizard — it takes 4 minutes and produces a personalized scholarship strategy.',
    expectations: 'We email you when something requires your attention. Nothing else.',
    cta: 'Start the wizard',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: '— Sam @ Top Uni',
    subject: (n: string) => n ? `Welcome, ${n}` : 'Welcome to Top Uni',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Одно действие прямо сейчас: запустить 3-шаговый мастер.',
    headingNamed: (n: string) => `Добро пожаловать, ${n}.`,
    headingNeutral: 'Добро пожаловать в Top Uni.',
    lead: 'Top Uni — поисковик стипендий и инструмент AI-стратегии для иностранных студентов. Запустите 3-шаговый мастер — 4 минуты, персональная стратегия на выходе.',
    expectations: 'Мы пишем только когда требуется ваше внимание. Больше ничего.',
    cta: 'Начать',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: '— Сэм @ Top Uni',
    subject: (n: string) => n ? `Добро пожаловать, ${n}` : 'Добро пожаловать в Top Uni',
  },
} as const

const WelcomeEmail = ({ name, wizardUrl = 'https://topuni.org/topuni-ai', unsubscribeUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.lead}</Text>
          <Button href={wizardUrl} style={primaryBtn}>{c.cta}</Button>
          <Hr style={hr} />
          <Text style={footer}>{c.expectations}</Text>
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
  component: WelcomeEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Signup · welcome email',
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
