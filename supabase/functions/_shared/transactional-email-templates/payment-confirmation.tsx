/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles, brand } from './brand.ts'

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
    receiptLabel: 'Amount',
    forLabel: 'For',
    cta: 'Go to dashboard',
    receiptNote: 'Official Stripe receipt',
    signoff: '— The Top Uni team',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    subject: (n: string, amount: string) =>
      n ? `${n} · Top Uni payment confirmed (${amount})` : `Top Uni · payment confirmed (${amount})`,
    tagline: 'Scholarship Strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: (amount: string) => `Оплата подтверждена — ${amount}`,
    headingNamed: (n: string) => `${n}, оплата подтверждена.`,
    headingNeutral: 'Оплата подтверждена.',
    receiptLabel: 'Сумма',
    forLabel: 'За',
    cta: 'Перейти в дашборд',
    receiptNote: 'Официальный чек Stripe',
    signoff: '— Команда Top Uni',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    subject: (n: string, amount: string) =>
      n ? `${n} · Top Uni — оплата подтверждена (${amount})` : `Top Uni — оплата подтверждена (${amount})`,
    tagline: 'Стипендиальная Стратегия',
  },
} as const

const receiptRow = { padding: '10px 0', borderBottom: `1px solid ${brand.divider}` } as const
const receiptLabel = { fontSize: '12px', color: brand.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' } as const
const receiptValue = { fontSize: '16px', color: brand.ink, fontWeight: 'bold' as const, margin: 0 } as const

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
      <Body style={styles.page}>
        <Container style={styles.container}>
          <Section style={styles.masthead}>
            <Text style={styles.wordmark}>Top Uni</Text>
            <Text style={styles.tagline}>{c.tagline}</Text>
          </Section>

          <Section style={styles.card}>
            <Heading as="h1" style={styles.h1}>
              {name ? c.headingNamed(name) : c.headingNeutral}
            </Heading>
            <Hr style={styles.goldRule} />

            <Section style={receiptRow}>
              <Text style={receiptLabel}>{c.receiptLabel}</Text>
              <Text style={receiptValue}>{amountFormatted}</Text>
            </Section>
            <Section style={receiptRow}>
              <Text style={receiptLabel}>{c.forLabel}</Text>
              <Text style={receiptValue}>{productLabel}</Text>
            </Section>

            <Section style={{ ...styles.ctaWrap, marginTop: '28px' }}>
              <Link href={dashboardUrl} style={styles.ctaPrimary}>{c.cta}</Link>
            </Section>

            {receiptUrl && (
              <Text style={{ ...styles.bodySmall, marginTop: '20px' }}>
                {c.receiptNote}: <a href={receiptUrl} style={{ color: brand.ink, textDecoration: 'underline' }}>{receiptUrl}</a>
              </Text>
            )}
            <Text style={styles.signoff}>{c.signoff}</Text>
          </Section>

          <Section style={styles.footer}>
            {unsubscribeUrl && (
              <Text style={styles.footerLine}>
                {c.footerPause}<a href={unsubscribeUrl} style={styles.footerLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
              </Text>
            )}
            <Text style={styles.footerLine}>Top Uni · topuni.org</Text>
          </Section>
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
