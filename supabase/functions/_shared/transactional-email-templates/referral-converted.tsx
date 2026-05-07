/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://topuni.org'

interface Props {
  name?: string
  referralCount?: number      // total premium conversions so far for this referrer
  language?: 'en' | 'ru'
}

const enOrdinal = (n: number): string =>
  n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`

const ruOrdinal = (n: number): string =>
  n === 1 ? 'первый' : n === 2 ? 'второй' : n === 3 ? 'третий' : `${n}-й`

const COPY = {
  en: {
    htmlLang: 'en',
    preview: (ord: string) => `Your ${ord} friend just upgraded — your free month is queued.`,
    headingNamed: (n: string) => `${n}, a friend you referred just upgraded.`,
    headingNeutral: 'Hi, a friend you referred just upgraded.',
    leadPre: 'Your ',
    leadPost: ' referral converted to Premium. As promised — you both get a free month of Premium added to your subscription.',
    nextKicker: 'What happens next',
    nextBody: 'The free month gets credited within 24 hours. Your next billing date moves out by 30 days. No action needed on your end. Your friend gets the same — their first month is on us.',
    seeReferralsCta: 'See your referrals',
    referPath: '/refer',
    keepGoingHead: 'Keep going.',
    keepGoingBody: 'No cap on referrals. Every friend who upgrades = another free month for you. Share your code:',
    shareCta: 'Get my share link',
    teamSignoff: '— The TopUni Consulting team',
    questions: 'Questions? Reply to this email — we read every message.',
    subjectFirst: '🎉 Your first referral just upgraded — free month queued',
    subjectMore: (ord: string) => `🎉 Your ${ord} referral upgraded — another free month queued`,
    ordinal: enOrdinal,
  },
  ru: {
    htmlLang: 'ru',
    preview: (ord: string) => `Ваш ${ord} друг апгрейднулся — бесплатный месяц вам зачисляется.`,
    headingNamed: (n: string) => `${n}, друг по вашей рекомендации только что оформил подписку.`,
    headingNeutral: 'Привет — друг по вашей рекомендации только что оформил подписку.',
    leadPre: 'Ваш ',
    leadPost: ' приглашённый перешёл на Premium. Как и обещали — вам и ему по бесплатному месяцу подписки.',
    nextKicker: 'Что дальше',
    nextBody: 'Бесплатный месяц зачисляется в течение 24 часов. Дата следующего списания отодвинется на 30 дней. От вас ничего не требуется. Ваш друг получает то же самое — его первый месяц за наш счёт.',
    seeReferralsCta: 'Открыть мои рекомендации',
    referPath: '/refer/ru',
    keepGoingHead: 'Продолжайте.',
    keepGoingBody: 'Лимита на рекомендации нет. Каждый друг с подпиской = ещё один бесплатный месяц вам. Делитесь ссылкой:',
    shareCta: 'Получить ссылку',
    teamSignoff: '— Команда TopUni Consulting',
    questions: 'Вопросы? Просто ответьте на это письмо — мы читаем каждое.',
    subjectFirst: '🎉 Ваша первая рекомендация апгрейднулась — бесплатный месяц вам зачисляется',
    subjectMore: (ord: string) => `🎉 Ваш ${ord} приглашённый апгрейднулся — ещё один бесплатный месяц вам`,
    ordinal: ruOrdinal,
  },
} as const

const ReferralConvertedEmail = ({ name, referralCount = 1, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const ordinal = c.ordinal(referralCount)

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview(ordinal)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>
            {c.leadPre}<strong>{ordinal}</strong>{c.leadPost}
          </Text>

          <Section style={card}>
            <Text style={cardKicker}>{c.nextKicker}</Text>
            <Text style={cardText}>{c.nextBody}</Text>
          </Section>

          <Section style={btnWrap}>
            <Button href={`${SITE_URL}${c.referPath}`} style={primaryBtn}>{c.seeReferralsCta}</Button>
          </Section>

          <Hr style={hr} />

          <Text style={subhead}>{c.keepGoingHead}</Text>
          <Text style={text}>{c.keepGoingBody}</Text>
          <Section style={codeRow}>
            <Button href={`${SITE_URL}${c.referPath}`} style={secondaryBtn}>{c.shareCta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{c.teamSignoff}</Text>
          <Text style={footerSmall}>{c.questions}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReferralConvertedEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    const n = Number(data.referralCount) || 1
    if (n === 1) return c.subjectFirst
    return c.subjectMore(c.ordinal(n))
  }),
  displayName: 'Referral converted to Premium',
  previewData: {
    name: 'Aizada',
    referralCount: 1,
    language: 'en',
  },
} satisfies TemplateEntry

/* Styles */
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px', lineHeight: '1.3' }
const lead = { fontSize: '16px', color: '#0a2540', lineHeight: '1.55', margin: '0 0 24px' }
const card = {
  backgroundColor: '#fbf7ed',
  border: '1px solid #e3c476',
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '0 0 24px',
}
const cardKicker = {
  fontSize: '11px', fontWeight: 'bold', color: '#b8860b',
  textTransform: 'uppercase' as const, letterSpacing: '0.18em',
  margin: '0 0 6px',
}
const cardText = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: 0 }
const btnWrap = { textAlign: 'center' as const, margin: '0 0 16px' }
const primaryBtn = {
  backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px',
  fontSize: '15px', fontWeight: 'bold', textDecoration: 'none',
}
const secondaryBtn = {
  backgroundColor: 'transparent', color: '#0a2540', padding: '12px 24px', borderRadius: '8px',
  fontSize: '14px', fontWeight: 'bold', textDecoration: 'none',
  border: '1px solid #0a2540',
}
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const subhead = { fontSize: '15px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 16px' }
const codeRow = { textAlign: 'center' as const, margin: '0 0 8px' }
const footer = { fontSize: '13px', color: '#3c4858', margin: '0 0 4px' }
const footerSmall = { fontSize: '11px', color: '#8898aa', margin: '4px 0 0' }
