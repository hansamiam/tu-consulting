/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

/**
 * Sent ~24-48h after an unauthenticated user completes the TopUni AI
 * wizard. Their email was captured in brief_leads but they never
 * signed up to save the plan. This nudge gives them a one-click route
 * back to their session.
 */
interface Props {
  name?: string
  recoverUrl: string
  unsubscribeUrl: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    previewNamed: (n: string) => `${n}, your TopUni strategy plan is still saved`,
    previewNeutral: 'Your TopUni strategy plan is still saved',
    headingNamed: (n: string) => `${n}, your plan is still here.`,
    headingNeutral: 'Your plan is still here.',
    lead: "You generated a personal strategy report on TopUni and stepped away before saving it. The plan — your shortlist, your essay angles, your 28-day action steps — is still in your browser, and we still have your spot. Open it back up in one click:",
    cta: 'Reopen my plan',
    kicker: 'One click · 10 seconds',
    body: "If you create an account this week, the plan locks in permanently — survive a browser reset, sync across devices, and you stop losing the live deadline alerts we already started tracking against your profile.",
    footerNext: "Not the right time? No follow-up after this — we'll be here when you're ready.",
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    teamSignoff: '— The TopUni Team',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}your TopUni plan is still saved`,
  },
  ru: {
    htmlLang: 'ru',
    previewNamed: (n: string) => `${n}, ваш план в TopUni сохранён`,
    previewNeutral: 'Ваш план в TopUni сохранён',
    headingNamed: (n: string) => `${n}, ваш план ещё здесь.`,
    headingNeutral: 'Ваш план ещё здесь.',
    lead: 'Вы сгенерировали персональный стратегический отчёт на TopUni и ушли, не сохранив его. План — ваш шорт-лист, идеи для эссе, план действий на 28 дней — всё ещё в браузере, и мы сохранили ваше место. Откройте в один клик:',
    cta: 'Открыть мой план',
    kicker: 'Один клик · 10 секунд',
    body: 'Если зарегистрируетесь на этой неделе, план закрепится навсегда — переживёт сброс браузера, синхронизируется между устройствами, и вы будете получать оповещения по дедлайнам, которые мы уже отслеживаем по вашему профилю.',
    footerNext: 'Не сейчас? Это последнее напоминание — мы будем здесь, когда понадобится.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    teamSignoff: '— Команда TopUni',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}ваш план в TopUni сохранён`,
  },
} as const

const BriefLeadNudgeEmail = ({ name, recoverUrl, unsubscribeUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{name ? c.previewNamed(name) : c.previewNeutral}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.lead}</Text>

          <Section style={card}>
            <Text style={kicker}>{c.kicker}</Text>
            <Text style={body}>{c.body}</Text>
            <Button href={recoverUrl} style={primaryBtn}>{c.cta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{c.footerNext}</Text>
          <Text style={footer}>
            {c.footerPause}<a href={unsubscribeUrl} style={subtleLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
          </Text>
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BriefLeadNudgeEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subjectFn(data.name ? String(data.name) : '')
  }),
  displayName: 'Brief lead · save-your-plan nudge',
  previewData: {
    name: 'Aizada',
    recoverUrl: 'https://topuni.org/topuni-ai',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px 18px 20px', margin: '0 0 14px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 12px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
