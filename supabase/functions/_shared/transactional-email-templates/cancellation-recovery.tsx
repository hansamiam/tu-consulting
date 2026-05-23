/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

/**
 * Fired by stripe-webhook when customer.subscription.updated reports
 * cancel_at_period_end transitioning false → true (the user clicked
 * "Cancel" in the Stripe customer portal). Account stays active until
 * current_period_end, so we have a window to offer reactivation +
 * gather signal on why they're leaving.
 */
interface Props {
  name?: string
  periodEndDate: string
  reactivateUrl: string
  surveyUrl?: string
  unsubscribeUrl?: string  // injected by send-transactional-email default
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    previewNamed: (n: string) => `${n}, sorry to see you go — quick question?`,
    previewNeutral: 'Sorry to see you go — quick question?',
    headingNamed: (n: string) => `${n}, sorry to see you go.`,
    headingNeutral: 'Sorry to see you go.',
    leadFn: (date: string) =>
      `Your TopUni membership is set to end on ${date}. Until then everything still works — brief, Pipeline, Resources, Discover. After that the account stays around but premium surfaces lock.`,
    surveyKicker: 'Two minutes',
    surveyTitle: 'What didn’t work?',
    surveyBody: 'Honest answer goes a long way. We read every one and most product changes start from one of these.',
    surveyCta: 'Tell us in 2 min',
    reactivateKicker: 'Changed your mind?',
    reactivateBody: 'You can resume from the same place — same price, same data.',
    reactivateCta: 'Stay a member',
    footerNext: 'Either way: thanks for the time you put into your applications with us. Wishing you good luck.',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    teamSignoff: '— Samuel + the TopUni team',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}sorry to see you go`,
  },
  ru: {
    htmlLang: 'ru',
    previewNamed: (n: string) => `${n}, жаль, что уходите — один вопрос?`,
    previewNeutral: 'Жаль, что уходите — один вопрос?',
    headingNamed: (n: string) => `${n}, жаль, что уходите.`,
    headingNeutral: 'Жаль, что уходите.',
    leadFn: (date: string) =>
      `Ваша подписка TopUni закончится ${date}. До этой даты всё работает как обычно — отчёт, Pipeline, ресурсы, Discover. После — аккаунт остаётся, но премиум-функции закрываются.`,
    surveyKicker: 'Две минуты',
    surveyTitle: 'Что не сработало?',
    surveyBody: 'Честный ответ важен. Мы читаем каждый — и большинство улучшений в продукте начинаются именно с них.',
    surveyCta: 'Поделиться за 2 мин',
    reactivateKicker: 'Передумали?',
    reactivateBody: 'Можно возобновить — та же цена, те же данные.',
    reactivateCta: 'Остаться с нами',
    footerNext: 'В любом случае — спасибо за время, которое вы вложили в свои заявки с нами. Удачи.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    teamSignoff: '— Сэмюэл и команда TopUni',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}жаль, что уходите`,
  },
} as const

const CancellationRecoveryEmail = ({
  name, periodEndDate, reactivateUrl, surveyUrl, unsubscribeUrl, language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{name ? c.previewNamed(name) : c.previewNeutral}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.leadFn(periodEndDate)}</Text>

          {surveyUrl && (
            <Section style={card}>
              <Text style={kicker}>{c.surveyKicker}</Text>
              <Heading style={h2}>{c.surveyTitle}</Heading>
              <Text style={body}>{c.surveyBody}</Text>
              <Button href={surveyUrl} style={primaryBtn}>{c.surveyCta}</Button>
            </Section>
          )}

          <Section style={card}>
            <Text style={kicker}>{c.reactivateKicker}</Text>
            <Text style={body}>{c.reactivateBody}</Text>
            <Button href={reactivateUrl} style={secondaryBtn}>{c.reactivateCta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{c.footerNext}</Text>
          {unsubscribeUrl && (
            <Text style={footer}>
              {c.footerPause}<a href={unsubscribeUrl} style={subtleLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
            </Text>
          )}
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CancellationRecoveryEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subjectFn(data.name ? String(data.name) : '')
  }),
  displayName: 'Billing · cancellation recovery',
  previewData: {
    name: 'Aizada',
    periodEndDate: 'June 12, 2026',
    reactivateUrl: 'https://topuni.org/account',
    surveyUrl: 'https://topuni.org/account?action=cancel-survey',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px 18px 20px', margin: '0 0 14px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 12px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const secondaryBtn = { backgroundColor: '#ffffff', color: '#0a2540', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #d0d7e0', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
