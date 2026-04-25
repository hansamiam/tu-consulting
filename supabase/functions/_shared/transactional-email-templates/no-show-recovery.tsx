import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  rebookUrl?: string
}

const NoShowEmail = ({ name, rebookUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We missed you — let's reschedule, no hard feelings</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Hey ${name},` : 'Hey there,'}</Heading>
        <Text style={lead}>
          We were ready and waiting — but you didn't make it to the call. Life happens, no judgment 🙂
        </Text>
        <Text style={text}>
          Here's the thing: <strong>application deadlines don't wait</strong>. Every week you delay
          is a week competitors are ahead on their essays, recommendations, and scholarship apps.
        </Text>
        <Text style={text}>
          Pick a new time that actually works for you — takes 30 seconds:
        </Text>
        {rebookUrl && (
          <Section style={btnWrap}>
            <Button href={rebookUrl} style={primaryBtn}>Reschedule my call</Button>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={text}>
          <strong>Not sure if consulting is right for you?</strong> Just reply to this email with
          your top question and we'll send a real, personal answer — no obligation.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NoShowEmail,
  subject: 'We missed you — reschedule in 30 seconds',
  displayName: 'No-show recovery',
  previewData: { name: 'Aizada', rebookUrl: 'https://topuni.org/booking' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px' }
const lead = { fontSize: '16px', color: '#0a2540', lineHeight: '1.5', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '28px 0 0' }
