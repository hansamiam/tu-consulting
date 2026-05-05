/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = 'TopUni'

interface Props {
  name?: string
  discoverUrl: string
  pipelineUrl: string
  briefReady: boolean
  manageUrl: string
}

const ActivationDay1Email = ({ name, discoverUrl, pipelineUrl, briefReady, manageUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{name ? `${name}, your TopUni starter steps for today` : 'Your TopUni starter steps for today'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `${name},` : 'Welcome,'} day one.</Heading>
        <Text style={lead}>
          {briefReady
            ? 'Your strategy brief is ready. Now we turn it into a working pipeline. Two small actions today get you from passive to active in this cycle:'
            : 'You signed up — that\'s the easy part. Two small actions today put you ahead of most applicants:'}
        </Text>

        <Section style={card}>
          <Text style={kicker}>Step 1 · 3 min</Text>
          <Heading style={h2}>Save 3 scholarships you actually like</Heading>
          <Text style={body}>
            Open Discover, hit Save on three scholarships that fit. Filter by funding type, country, or your demographic if it helps. Don't overthink — these aren't commitments, they're a starting set.
          </Text>
          <Button href={discoverUrl} style={primaryBtn}>Open Discover</Button>
        </Section>

        <Section style={card}>
          <Text style={kicker}>Step 2 · 1 min</Text>
          <Heading style={h2}>Open your Pipeline</Heading>
          <Text style={body}>
            Anything you saved lives there with deadlines, status, notes. Hitting it once today wires the habit — most TopUni members who win opened Pipeline 5+ times in their first week.
          </Text>
          <Button href={pipelineUrl} style={secondaryBtn}>Open Pipeline</Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          You'll hear from us at week's end with what to do next. Earlier if a saved deadline gets close.
        </Text>
        <Text style={footer}>
          Don't want activation emails? <a href={manageUrl} style={subtleLink}>Pause from your account</a>.
        </Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ActivationDay1Email,
  subject: ((data: Record<string, any>) => {
    const n = data.name ? `${String(data.name)}, ` : ''
    return `${n}two steps for day one`
  }),
  displayName: 'Activation · day 1',
  previewData: {
    name: 'Aizada',
    discoverUrl: 'https://topuni.org/discover',
    pipelineUrl: 'https://topuni.org/pipeline',
    briefReady: true,
    manageUrl: 'https://topuni.org/account?action=pause-nudges',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px 18px 20px', margin: '0 0 14px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 12px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const secondaryBtn = { backgroundColor: '#ffffff', color: '#0a2540', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #d0d7e0', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
