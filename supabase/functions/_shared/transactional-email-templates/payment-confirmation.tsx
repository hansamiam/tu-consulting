/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  amountFormatted: string
  productLabel: string
  dashboardUrl?: string
  receiptUrl?: string
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: (amount: string) => `Payment confirmed — ${amount}`,
    headingNamed: (n: string) => `${n}, payment confirmed.`,
    headingNeutral: 'Payment confirmed.',
    charged: (amount: string, product: string) => `${amount} charged for ${product}.`,
    unlocked: 'Your dashboard is ready.',
    dashboardCta: 'Go to dashboard',
    receiptNote: 'Official receipt:',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: '— The Top Uni Team',
    subject: (n: string, amount: string) =>
      n ? `${n} — Top Uni payment confirmed (${amount})` : `Top Uni — payment confirmed (${amount})`,
  },
  ru: {
    htmlLang: 'ru',
    preview: (amount: string) => `Оплата подтверждена — ${amount}`,
    headingNamed: (n: string) => `${n}, оплата подтверждена.`,
    headingNeutral: 'Оплата подтверждена.',
    charged: (amount: string, product: string) => `${amount} списано за ${product}.`,
    unlocked: 'Ваш дашборд готов.',
    dashboardCta: 'Перейти в дашборд',
    receiptNote: 'Официальный чек:',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: '— Команда Top Uni',
    subject: (n: string, amount: string) =>
      n ? `${n} — Top Uni оплата подтверждена (${amount})` : `Top Uni — оплата подтверждена (${amount})`,
  },
} as const

const PaymentConfirmationEmail = ({
  name,
  amountFormatted,
  productLabel,
  dashboardUrl = 'https://topuni.org/discover',
  receiptUrl,
  unsubscribeUrl,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview(amountFormatted)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.charged(amountFormatted, productLabel)}</Text>
          <Text style={lead}>{c.unlocked}</Text>
          <Section style={btnWrap}>
            <Link href={dashboardUrl} style={primaryBtn}>{c.dashboardCta}</Link>
          </Section>
          {receiptUrl && (
            <Text style={receiptLine}>
              {c.receiptNote} <a href={receiptUrl} style={subtleLink}>{receiptUrl}</a>
            </Text>
          )}
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
  component: PaymentConfirmationEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(
      data.name ? String(data.name) : '',
      data.amountFormatted ? String(data.amountFormatted) : '',
    )
  }),
  displayName: 'Billing · payment confirmed',
  previewData: {
    name: 'Aizada',
    amountFormatted: '$39.99',
    productLabel: 'Top Uni Founding Membership',
    dashboardUrl: 'https://topuni.org/discover',
    receiptUrl: 'https://invoice.stripe.com/i/preview',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 10px' }
const btnWrap = { margin: '18px 0 14px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const receiptLine = { fontSize: '12px', color: '#8898aa', margin: '12px 0 0', wordBreak: 'break-all' as const }
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
