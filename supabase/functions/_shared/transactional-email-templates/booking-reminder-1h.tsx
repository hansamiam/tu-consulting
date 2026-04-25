import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  meetingUrl?: string
}

const Reminder1hEmail = ({ name, meetingUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your TopUni call starts in 1 hour</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `${name}, we're on in 1 hour` : "We're on in 1 hour"}</Heading>
        <Text style={lead}>Quick checklist:</Text>
        <Text style={text}>
          ✅ Quiet space with stable internet<br />
          ✅ Transcript / grades open in another tab<br />
          ✅ Notepad ready (you'll get a lot of info)<br />
          ✅ Camera on if possible — it makes the conversation 2x better
        </Text>
        {meetingUrl && (
          <Section style={btnWrap}>
            <Button href={meetingUrl} style={primaryBtn}>Join the call</Button>
          </Section>
        )}
        <Text style={text}>
          If something urgent comes up, just reply to this email and we'll reschedule — no judgment.
        </Text>
        <Text style={footer}>See you soon,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Reminder1hEmail,
  subject: '🚀 Your TopUni call starts in 1 hour',
  displayName: '1-hour reminder',
  previewData: { name: 'Aizada', meetingUrl: 'https://zoom.us/j/123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px' }
const lead = { fontSize: '16px', color: '#0a2540', lineHeight: '1.5', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.8', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '28px 0 0' }
