/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = 'TopUni'

interface Props {
  name?: string
  daysAway: number
  newScholarshipsSinceVisit: number
  trackedCount: number
  pipelineUrl: string
  discoverUrl: string
  manageUrl: string
}

const InactiveWinbackEmail = ({
  name, daysAway, newScholarshipsSinceVisit, trackedCount, pipelineUrl, discoverUrl, manageUrl,
}: Props) => {
  const lead = trackedCount > 0
    ? `It's been ${daysAway} days since you checked in. ${trackedCount === 1 ? 'You have 1 saved scholarship still in your pipeline' : `You have ${trackedCount} saved scholarships still in your pipeline`} — most cycles are decided in the back half, not the start.`
    : `It's been ${daysAway} days. We've added ${newScholarshipsSinceVisit > 0 ? `${newScholarshipsSinceVisit} new scholarships` : 'new scholarships'} to the database since you last visited.`

  const cta = trackedCount > 0
    ? { label: 'Open Pipeline', href: pipelineUrl }
    : { label: 'Open Discover', href: discoverUrl }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{name ? `${name}, ` : ''}{daysAway}+ days since your last visit</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `${name},` : 'Hi,'} we kept the lights on.</Heading>
          <Text style={leadText}>{lead}</Text>

          {newScholarshipsSinceVisit > 0 && (
            <Section style={card}>
              <Text style={kicker}>New since you've been away</Text>
              <Heading style={h2}>{newScholarshipsSinceVisit} scholarships added</Heading>
              <Text style={body}>
                Some of them probably match your saved searches and filters. Worth a 60-second scroll to see if anything's worth saving.
              </Text>
            </Section>
          )}

          <Section style={btnWrap}>
            <Button href={cta.href} style={primaryBtn}>{cta.label}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Not interested anymore? <a href={manageUrl} style={subtleLink}>Pause emails from your account</a> or just ignore this — we won't bug you.
          </Text>
          <Text style={footer}>— The {SITE} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InactiveWinbackEmail,
  subject: ((data: Record<string, any>) => {
    const n = data.name ? `${String(data.name)}, ` : ''
    const days = Number(data.daysAway) || 30
    const newScholarships = Number(data.newScholarshipsSinceVisit) || 0
    if (newScholarships > 0) return `${n}${newScholarships} new scholarships since you've been gone`
    return `${n}${days} days — your TopUni pipeline is still here`
  }),
  displayName: 'Inactive · win-back',
  previewData: {
    name: 'Aizada',
    daysAway: 32,
    newScholarshipsSinceVisit: 14,
    trackedCount: 6,
    pipelineUrl: 'https://topuni.org/pipeline',
    discoverUrl: 'https://topuni.org/discover',
    manageUrl: 'https://topuni.org/account?action=pause-nudges',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const leadText = { fontSize: '15px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 20px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px', margin: '0 0 18px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0' }
const btnWrap = { textAlign: 'center' as const, margin: '20px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0 18px' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
