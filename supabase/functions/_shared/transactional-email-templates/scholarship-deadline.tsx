/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  scholarshipName: string
  deadlineDate: string         // human-readable, e.g. "January 15, 2026"
  daysRemaining: number        // for the urgency line
  status?: string              // e.g. "drafting" — what status the student last set
  amount?: string              // e.g. "Full tuition + $20K stipend"
  scholarshipUrl?: string      // official URL to apply
  trackerUrl: string           // link back to the user's Discover pipeline
}

const ScholarshipDeadlineEmail = ({
  name,
  scholarshipName,
  deadlineDate,
  daysRemaining,
  status,
  amount,
  scholarshipUrl,
  trackerUrl,
}: Props) => {
  const urgencyLine =
    daysRemaining <= 0
      ? `Today is the deadline.`
      : daysRemaining === 1
        ? `Tomorrow is the deadline.`
        : daysRemaining <= 7
          ? `${daysRemaining} days until the deadline.`
          : daysRemaining <= 30
            ? `${daysRemaining} days remaining.`
            : `Deadline in ${daysRemaining} days.`

  const urgencyColor =
    daysRemaining <= 7 ? '#b00020' : daysRemaining <= 14 ? '#b8860b' : '#0a2540'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{urgencyLine} {scholarshipName} closes {deadlineDate}.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {name ? `${name},` : 'Hi,'} a deadline you tracked is coming up.
          </Heading>
          <Section style={card}>
            <Text style={kicker}>Tracking</Text>
            <Heading style={h2}>{scholarshipName}</Heading>
            {amount && <Text style={amountText}>{amount}</Text>}
            <Hr style={hr} />
            <Text style={{ ...lead, color: urgencyColor }}>{urgencyLine}</Text>
            <Text style={text}>Deadline: <strong>{deadlineDate}</strong></Text>
            {status && <Text style={text}>Your last status: <strong>{status}</strong></Text>}
          </Section>

          <Section style={btnWrap}>
            {scholarshipUrl && (
              <Button href={scholarshipUrl} style={primaryBtn}>
                Open the application
              </Button>
            )}
            <Text style={subtle}>
              <a href={trackerUrl} style={subtleLink}>Update status in your pipeline →</a>
            </Text>
          </Section>

          <Hr style={hr} />
          <Heading style={h3}>What to do this week</Heading>
          <Text style={text}>
            <strong>If submitted:</strong> note the decision date in your calendar; mark <em>Awaiting decision</em>.<br /><br />
            <strong>If drafting:</strong> get a fresh pair of eyes on your essays — peer or counselor — at least 72h before deadline. Last-minute revisions miss obvious things.<br /><br />
            <strong>If researching:</strong> decide today whether you'll apply. Skipping is a decision; partial applications waste your time more than skipping does.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Mute reminders for this scholarship — open it in <a href={trackerUrl} style={subtleLink}>your tracker</a> and change the status to <em>Rejected</em> or <em>Decision</em>.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ScholarshipDeadlineEmail,
  subject: ((data: Record<string, any>) => {
    const days = Number(data.daysRemaining) || 0
    if (days <= 0) return `🚨 Today: ${data.scholarshipName}`
    if (days === 1) return `🚨 Tomorrow: ${data.scholarshipName}`
    if (days <= 7) return `⏰ ${days} days left — ${data.scholarshipName}`
    return `${days} days until ${data.scholarshipName}`
  }),
  displayName: 'Scholarship deadline reminder',
  previewData: {
    name: 'Aizada',
    scholarshipName: 'Chevening Scholarships',
    deadlineDate: 'November 5, 2026',
    daysRemaining: 14,
    status: 'drafting',
    amount: 'Full UK tuition + £18,000 stipend',
    scholarshipUrl: 'https://www.chevening.org/scholarships/',
    trackerUrl: 'https://topuni.org/discover',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 24px', lineHeight: '1.3' }
const h2 = { fontSize: '20px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const h3 = { fontSize: '15px', fontWeight: 'bold', color: '#0a2540', margin: '4px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px' }
const lead = { fontSize: '17px', fontWeight: 'bold', lineHeight: '1.4', margin: '12px 0 8px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 6px' }
const amountText = { fontSize: '13px', color: '#5d6b7a', margin: '0 0 12px' }
const subtle = { fontSize: '13px', color: '#8898aa', textAlign: 'center' as const, margin: '12px 0 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
