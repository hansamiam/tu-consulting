import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  consultationType?: string
  bookingUrl?: string
  intakeUrl?: string
}

const BookingConfirmationEmail = ({ name, consultationType, bookingUrl, intakeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your consultation is confirmed — one quick step before we meet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Hi ${name},` : 'Hi there,'}</Heading>
        <Text style={lead}>
          Your <strong>{consultationType || 'consultation'}</strong> with {SITE_NAME} is confirmed.
        </Text>
        <Text style={text}>
          Before we meet, please take 90 seconds to fill out a short intake form. This lets your
          consultant prepare a tailored university shortlist instead of spending the call on basics —
          you'll get 10x more value out of our time together.
        </Text>
        {intakeUrl && (
          <Section style={btnWrap}>
            <Button href={intakeUrl} style={primaryBtn}>
              Complete pre-call intake (90 sec)
            </Button>
          </Section>
        )}
        <Hr style={hr} />
        <Heading style={h2}>What to expect</Heading>
        <Text style={text}>
          • A real human consultant — not an AI, not a junior intern<br />
          • A clear shortlist of universities matched to your profile<br />
          • Honest answers about admissions odds, scholarships, and visas<br />
          • No high-pressure sales — if we're not the right fit, we'll tell you
        </Text>
        {bookingUrl && (
          <Text style={text}>
            Need to reschedule? <a href={bookingUrl} style={link}>Manage your booking</a>.
          </Text>
        )}
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: 'Your TopUni consultation is confirmed ✓',
  displayName: 'Booking confirmation',
  previewData: { name: 'Aizada', consultationType: 'Strategy Session', intakeUrl: 'https://topuni.org/intake', bookingUrl: 'https://topuni.org/booking' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '24px 0 12px' }
const lead = { fontSize: '16px', color: '#0a2540', lineHeight: '1.5', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '28px 0' }
const link = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '28px 0 0' }
