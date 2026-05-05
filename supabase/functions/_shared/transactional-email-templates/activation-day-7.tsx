/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = 'TopUni'

interface Props {
  name?: string
  trackedCount: number
  upcomingDeadlineCount: number
  pipelineUrl: string
  discoverUrl: string
  manageUrl: string
}

const ActivationDay7Email = ({ name, trackedCount, upcomingDeadlineCount, pipelineUrl, discoverUrl, manageUrl }: Props) => {
  const lead = trackedCount === 0
    ? 'A week in. You haven\'t saved anything yet — totally fine, it just means we don\'t have a plan to react to. The fastest way out of "thinking about it" is to save 3 scholarships and let Pipeline do the deadline-tracking for you.'
    : trackedCount === 1
      ? 'A week in. One scholarship saved. The students who actually convert tend to have 5–8 in active rotation — gives the pipeline real signal and means you\'re not pinning everything on a single decision.'
      : `A week in. ${trackedCount} scholarships saved${upcomingDeadlineCount > 0 ? `, ${upcomingDeadlineCount} with deadlines in the next 30 days` : ''}. Now the work is iterating on essays + tracking status — the membership is built for exactly this stretch.`

  const nextStepLabel = trackedCount === 0
    ? 'Open Discover and save 3'
    : trackedCount < 5
      ? 'Add 2-3 more to Pipeline'
      : 'Open Pipeline · what changed'

  const nextStepHref = trackedCount === 0 || trackedCount < 5 ? discoverUrl : pipelineUrl

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{name ? `${name}, week 1 check-in` : 'Week 1 check-in'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `${name},` : 'Hi,'} your first week.</Heading>
          <Text style={leadText}>{lead}</Text>

          <Section style={card}>
            <Text style={kicker}>Most-leveraged next step</Text>
            <Heading style={h2}>{nextStepLabel}</Heading>
            <Button href={nextStepHref} style={primaryBtn}>Go</Button>
          </Section>

          <Hr style={hr} />
          <Heading style={h3}>Two patterns from members who win</Heading>
          <Text style={body}>
            <strong>1. Volume early, edit late.</strong> Save broadly the first two weeks; cull aggressively in week three. Trying to pick perfectly upfront is how you miss good fits.
          </Text>
          <Text style={body}>
            <strong>2. Draft openings before you commit.</strong> Inside any saved scholarship's Pipeline row, the "Get 3 starting drafts" button gives you three opening angles. Use it to test which scholarship's prompt actually has something to say back.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Don't want check-ins? <a href={manageUrl} style={subtleLink}>Pause from your account</a>.
          </Text>
          <Text style={footer}>— The {SITE} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ActivationDay7Email,
  subject: ((data: Record<string, any>) => {
    const n = data.name ? `${String(data.name)}, ` : ''
    const tracked = Number(data.trackedCount) || 0
    if (tracked === 0) return `${n}week 1 — let's get you a plan`
    return `${n}week 1 check-in (${tracked} saved)`
  }),
  displayName: 'Activation · day 7',
  previewData: {
    name: 'Aizada',
    trackedCount: 4,
    upcomingDeadlineCount: 2,
    pipelineUrl: 'https://topuni.org/pipeline',
    discoverUrl: 'https://topuni.org/discover',
    manageUrl: 'https://topuni.org/account?action=pause-nudges',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 12px', lineHeight: '1.25' }
const h3 = { fontSize: '14px', fontWeight: 'bold', color: '#0a2540', margin: '8px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const leadText = { fontSize: '15px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 20px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px 18px 20px', margin: '0 0 18px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 12px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
