/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'
const SITE_URL = 'https://topuni.org'

interface Props {
  name?: string
  referralCount?: number      // total premium conversions so far for this referrer
}

const ReferralConvertedEmail = ({ name, referralCount = 1 }: Props) => {
  const ordinal =
    referralCount === 1 ? 'first' :
    referralCount === 2 ? 'second' :
    referralCount === 3 ? 'third' :
    `${referralCount}th`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {ordinal} friend just upgraded — your free month is queued.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `${name},` : 'Hi,'} a friend you referred just upgraded.</Heading>
          <Text style={lead}>
            Your <strong>{ordinal}</strong> referral converted to Premium. As promised — you both get a free month
            of Premium added to your subscription.
          </Text>

          <Section style={card}>
            <Text style={cardKicker}>What happens next</Text>
            <Text style={cardText}>
              The free month gets credited within 24 hours. Your next billing date moves out by 30 days. No action
              needed on your end. Your friend gets the same — their first month is on us.
            </Text>
          </Section>

          <Section style={btnWrap}>
            <Button href={`${SITE_URL}/refer`} style={primaryBtn}>See your referrals</Button>
          </Section>

          <Hr style={hr} />

          <Text style={subhead}>Keep going.</Text>
          <Text style={text}>
            No cap on referrals. Every friend who upgrades = another free month for you.
            Share your code:
          </Text>
          <Section style={codeRow}>
            <Button href={`${SITE_URL}/refer`} style={secondaryBtn}>Get my share link</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} team</Text>
          <Text style={footerSmall}>
            Questions? Reply to this email — we read every message.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReferralConvertedEmail,
  subject: ((data: Record<string, any>) => {
    const n = Number(data.referralCount) || 1
    if (n === 1) return '🎉 Your first referral just upgraded — free month queued'
    return `🎉 Your ${n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} referral upgraded — another free month queued`
  }),
  displayName: 'Referral converted to Premium',
  previewData: {
    name: 'Aizada',
    referralCount: 1,
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
