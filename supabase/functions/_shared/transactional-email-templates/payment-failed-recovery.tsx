/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

/**
 * Fired by stripe-webhook on invoice.payment_failed. Stripe retries
 * the invoice over the next ~3 weeks (default Smart Retries); after
 * 4 failed retries the subscription gets canceled. This email gives
 * the member a one-click route to fix the card before that happens.
 */
interface Props {
  name?: string
  billingPortalUrl: string
  unsubscribeUrl?: string  // injected by send-transactional-email default
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    previewNamed: (n: string) => `${n}, your TopUni card just failed — update in 1 click`,
    previewNeutral: 'Your TopUni card just failed — update in 1 click',
    headingNamed: (n: string) => `${n}, your card just bounced.`,
    headingNeutral: 'Your card just bounced.',
    lead: "Stripe couldn't charge the card on file for your TopUni membership. No urgency yet — Stripe will retry over the next few days. But if the card expired or the funds aren't there, you'll want to swap it before retries run out and the subscription auto-cancels.",
    cta: 'Update card',
    kicker: 'One click · 60 seconds',
    body: 'Your account stays fully active during the retry window. Updating now means zero gap.',
    footerNext: "If the card is fine and this was a one-off — ignore this; Stripe's next retry will go through.",
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    teamSignoff: '— The TopUni Team',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}your TopUni card just failed`,
  },
  ru: {
    htmlLang: 'ru',
    previewNamed: (n: string) => `${n}, оплата TopUni не прошла — обновите карту`,
    previewNeutral: 'Оплата TopUni не прошла — обновите карту',
    headingNamed: (n: string) => `${n}, оплата не прошла.`,
    headingNeutral: 'Оплата не прошла.',
    lead: 'Stripe не смог списать оплату с привязанной карты за вашу подписку TopUni. Срочности пока нет — Stripe попробует ещё несколько раз в течение нескольких дней. Но если карта истекла или на ней не хватает средств, лучше заменить её до того, как попытки закончатся и подписка автоматически отменится.',
    cta: 'Обновить карту',
    kicker: 'Один клик · 60 секунд',
    body: 'В течение периода повторных попыток ваш аккаунт активен. Обновление сейчас = ноль пропуска.',
    footerNext: 'Если с картой всё в порядке и это была разовая ошибка — игнорируйте; следующая попытка Stripe пройдёт успешно.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    teamSignoff: '— Команда TopUni',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}оплата TopUni не прошла`,
  },
} as const

const PaymentFailedRecoveryEmail = ({ name, billingPortalUrl, unsubscribeUrl, language = 'en' }: Props) => {
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
            <Button href={billingPortalUrl} style={primaryBtn}>{c.cta}</Button>
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
  component: PaymentFailedRecoveryEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subjectFn(data.name ? String(data.name) : '')
  }),
  displayName: 'Billing · payment failed recovery',
  previewData: {
    name: 'Aizada',
    billingPortalUrl: 'https://topuni.org/account',
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
