import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  scheduledAt?: string
  meetingUrl?: string
  intakeCompleted?: boolean
  intakeUrl?: string
}

const Reminder24hEmail = ({ name, scheduledAt, meetingUrl, intakeCompleted, intakeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your TopUni call is tomorrow — here's how to make it count</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `${name}, see you tomorrow!` : 'See you tomorrow!'}</Heading>
        <Text style={lead}>
          Your consultation is scheduled for <strong>{scheduledAt || 'tomorrow'}</strong>.
        </Text>
        {!intakeCompleted && intakeUrl && (
          <Section style={alertBox}>
            <Text style={alertText}>
              ⚠️ <strong>Heads up:</strong> you haven't completed the pre-call intake yet.
              Without it we'll spend half the call on basics. Takes 90 seconds:
            </Text>
            <Button href={intakeUrl} style={primaryBtn}>Complete intake now</Button>
          </Section>
        )}
        <Heading style={h2}>3 things to prepare</Heading>
        <Text style={text}>
          <strong>1. Your transcript or grades</strong> — even a screenshot works. Helps us assess admissions odds in real-time.<br /><br />
          <strong>2. Your top 2-3 dream countries</strong> — even if they feel unrealistic. We'll tell you the truth and find better-fit alternatives.<br /><br />
          <strong>3. Your honest budget range</strong> — including family contribution. We'll only show universities you can actually afford (with scholarships factored in).
        </Text>
        <Hr style={hr} />
        {meetingUrl && (
          <Section style={btnWrap}>
            <Button href={meetingUrl} style={primaryBtn}>Join the call</Button>
          </Section>
        )}
        <Text style={footer}>Talk soon,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Reminder24hEmail,
  subject: '⏰ Your TopUni consultation is in 24 hours',
  displayName: '24-hour reminder',
  previewData: { name: 'Aizada', scheduledAt: 'Tomorrow at 3:00 PM', meetingUrl: 'https://zoom.us/j/123', intakeCompleted: false, intakeUrl: 'https://topuni.org/intake' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '24px 0 12px' }
const lead = { fontSize: '16px', color: '#0a2540', lineHeight: '1.5', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 16px' }
const alertBox = { backgroundColor: '#fff8e1', border: '1px solid #ffd54f', borderRadius: '8px', padding: '16px', margin: '20px 0' }
const alertText = { fontSize: '14px', color: '#5d4037', lineHeight: '1.5', margin: '0 0 12px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '28px 0 0' }
