/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

/**
 * Fired by stripe-webhook on invoice.payment_succeeded ONLY when
 * billing_reason === 'subscription_cycle' (i.e. true renewal — not the
 * first charge on a new subscription, which is covered by membership-welcome).
 *
 * Why this exists: members get charged monthly with zero acknowledgement,
 * which can look like silent unauthorized billing — especially for a brand
 * new subscriber whose first renewal hits 30 days after signup with no email
 * in between. This is the receipt + "you're still in control" surface.
 *
 * Body stays brief: amount, period, link to the Stripe billing portal where
 * they can download the official invoice / cancel / swap card. No upsells,
 * no cards, no marketing.
 *
 * Idempotency lives in stripe-webhook — keyed by `invoice.id` so a webhook
 * retry doesn't double-send.
 */
interface Props {
  /** Renewal charge amount in major units (e.g. 19 for $19). */
  amount: number
  /** ISO 4217 currency, lower-case (e.g. 'usd'). */
  currency: string
  /** ISO date for the start of the renewed period. */
  periodStart: string
  /** ISO date for the end of the renewed period (next charge date). */
  periodEnd: string
  /** Stripe billing portal session URL — single CTA. */
  billingPortalUrl: string
  /** 'pro' | 'founding' — drives the membership label in the body. */
  tier: 'pro' | 'founding'
  /** Injected by send-transactional-email default. */
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

function formatMoney(amount: number, currency: string, lang: 'en' | 'ru'): string {
  try {
    return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency.toUpperCase()}`
  }
}

function formatDate(iso: string, lang: 'en' | 'ru'): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: (money: string) => `${money} — your TopUni membership renewed.`,
    heading: 'Your TopUni membership renewed',
    leadFn: (money: string, tier: string) =>
      `Quick receipt — your TopUni ${tier === 'founding' ? 'Founding' : 'Pro'} membership renewed for ${money}. No action needed; this is just so the charge isn't a surprise.`,
    detailsHeading: 'Details',
    amountLabel: 'Amount',
    periodLabel: 'Period',
    periodFn: (start: string, end: string) => `${start} → ${end}`,
    nextChargeFn: (end: string) => `Next charge on ${end}, same card.`,
    portalLine: 'Need the official invoice, want to swap your card, or thinking about cancelling? All of it lives in one place.',
    portalCta: 'Open billing portal',
    footerNote: 'Reply to this email and it reaches us directly.',
    footerPause: "Don't want these receipts? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    teamSignoff: '— Samuel + the TopUni team',
    subjectFn: () => 'Your TopUni membership renewed',
  },
  ru: {
    htmlLang: 'ru',
    preview: (money: string) => `${money} — подписка TopUni продлена.`,
    heading: 'Подписка TopUni продлена',
    leadFn: (money: string, tier: string) =>
      `Короткий чек — ваша подписка TopUni ${tier === 'founding' ? 'Founding' : 'Pro'} продлена на ${money}. Ничего делать не нужно; просто чтобы списание не стало сюрпризом.`,
    detailsHeading: 'Детали',
    amountLabel: 'Сумма',
    periodLabel: 'Период',
    periodFn: (start: string, end: string) => `${start} → ${end}`,
    nextChargeFn: (end: string) => `Следующее списание ${end}, та же карта.`,
    portalLine: 'Нужен официальный инвойс, хотите заменить карту или отменить подписку? Всё в одном месте.',
    portalCta: 'Открыть биллинг',
    footerNote: 'Ответьте на это письмо — оно приходит к нам напрямую.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    teamSignoff: '— Сэмюэл и команда TopUni',
    subjectFn: () => 'Подписка TopUni продлена',
  },
} as const

const RenewalReceiptEmail = ({
  amount, currency, periodStart, periodEnd, billingPortalUrl, tier,
  unsubscribeUrl, language = 'en',
}: Props) => {
  const lang = language === 'ru' ? 'ru' : 'en'
  const c = COPY[lang]
  const money = formatMoney(amount, currency, lang)
  const startStr = formatDate(periodStart, lang)
  const endStr = formatDate(periodEnd, lang)
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview(money)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{c.heading}</Heading>
          <Text style={lead}>{c.leadFn(money, tier)}</Text>

          <Section style={card}>
            <Text style={kicker}>{c.detailsHeading}</Text>
            <Text style={row}>
              <span style={rowLabel}>{c.amountLabel}: </span>
              <span style={rowValue}>{money}</span>
            </Text>
            <Text style={row}>
              <span style={rowLabel}>{c.periodLabel}: </span>
              <span style={rowValue}>{c.periodFn(startStr, endStr)}</span>
            </Text>
            <Text style={rowMuted}>{c.nextChargeFn(endStr)}</Text>
          </Section>

          <Text style={body}>{c.portalLine}</Text>
          <Section style={{ margin: '8px 0 20px' }}>
            <Button href={billingPortalUrl} style={primaryBtn}>{c.portalCta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{c.footerNote}</Text>
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
  component: RenewalReceiptEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subjectFn()
  }),
  displayName: 'Billing · renewal receipt',
  previewData: {
    amount: 19,
    currency: 'usd',
    periodStart: '2026-05-24T00:00:00.000Z',
    periodEnd: '2026-06-24T00:00:00.000Z',
    billingPortalUrl: 'https://billing.stripe.com/p/session/preview',
    tier: 'pro',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px 18px 16px', margin: '0 0 18px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 10px' }
const row = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 6px' }
const rowLabel = { color: '#8898aa' }
const rowValue = { color: '#0a2540', fontWeight: 'bold' as const }
const rowMuted = { fontSize: '13px', color: '#8898aa', lineHeight: '1.5', margin: '6px 0 0' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 12px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
