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
  // The AI-generated body — markdown-ish. We render it as paragraphs;
  // if it contains markdown we won't fully resolve it (kept simple).
  aiBody: string
  trackedCount?: number
  urgentDeadlines?: number
  statusPending?: number
  unsubscribeUrl?: string
}

/** Cheap markdown → react: split paragraphs, bold **text**, * italic */
const renderMarkdown = (md: string): React.ReactNode[] => {
  const paragraphs = md.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  return paragraphs.map((para, i) => {
    // Bullet list?
    if (/^[-*]\s/.test(para)) {
      const items = para.split(/\n/).map((l) => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
      return (
        <ul key={i} style={ulStyle}>
          {items.map((it, j) => <li key={j} style={liStyle}>{renderInline(it)}</li>)}
        </ul>
      )
    }
    return <Text key={i} style={text}>{renderInline(para)}</Text>
  })
}
const renderInline = (s: string): React.ReactNode => {
  const parts = s.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} style={{ color: '#0a2540' }}>{p.slice(2, -2)}</strong>
    }
    return <React.Fragment key={i}>{p}</React.Fragment>
  })
}

const WeeklyNudgeEmail = ({ name, aiBody, trackedCount = 0, urgentDeadlines = 0, statusPending = 0, unsubscribeUrl }: Props) => {
  const greeting = name ? `${name},` : 'Hi,'
  const statsLine = (() => {
    const parts: string[] = []
    if (trackedCount > 0) parts.push(`${trackedCount} tracked`)
    if (urgentDeadlines > 0) parts.push(`${urgentDeadlines} closing in 30 days`)
    if (statusPending > 0) parts.push(`${statusPending} no status set`)
    return parts.join(' · ')
  })()

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{aiBody.split(/\n+/).find((l) => l.trim())?.slice(0, 110) || 'Your week ahead'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{greeting}</Heading>
          <Heading style={h2}>This week's plan from your TopUni coach.</Heading>

          {statsLine && (
            <Section style={statsBox}>
              <Text style={statsText}>{statsLine}</Text>
            </Section>
          )}

          <Section style={aiBodyBox}>
            {renderMarkdown(aiBody)}
          </Section>

          <Hr style={hr} />

          <Section style={ctaWrap}>
            <Button href={`${SITE_URL}/pipeline`} style={primaryBtn}>Open my pipeline →</Button>
          </Section>
          <Text style={subtle}>
            <a href={`${SITE_URL}/topuni-ai`} style={link}>Talk to my AI counselor</a> · <a href={`${SITE_URL}/discover`} style={link}>Find new scholarships</a>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            You're getting this because you have active applications saved in TopUni. Nudges are weekly.
          </Text>
          <Text style={footer}>
            {unsubscribeUrl ? <a href={unsubscribeUrl} style={footerLink}>Pause weekly nudges</a> : null}
            {' '}— The {SITE_NAME} team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyNudgeEmail,
  subject: ((data: Record<string, any>) => {
    const name = data.name as string | undefined
    const urgent = Number(data.urgentDeadlines) || 0
    if (urgent >= 1) return `${name ? `${name}, ` : ''}${urgent} ${urgent === 1 ? 'deadline' : 'deadlines'} this month — what to do this week`
    return `${name ? `${name}'s ` : 'Your '}3 things this week`
  }),
  displayName: 'Weekly nudge',
  previewData: {
    name: 'Aizada',
    aiBody:
      "**This week's call: finish the Chevening first draft.**\n\n" +
      "You've had Chevening sitting in *Researching* for 18 days. The application window opens in 6 weeks and the strongest essays are the ones that have been through three rewrites by then. Move it to **Drafting** today.\n\n" +
      "**Two more priorities:**\n\n" +
      "- Schwarzman: book one 30-min call with a recommender by Friday — your timeline tab still shows no recommender confirmed.\n" +
      "- DAAD EPOS: it's eligible for your nationality and field; you haven't saved it. Worth a 5-minute look in Discover.\n\n" +
      "Strongest signal in your profile: the Korean development-economics work. Lead with it in every essay.",
    trackedCount: 7,
    urgentDeadlines: 2,
    statusPending: 3,
    unsubscribeUrl: 'https://topuni.org/account?action=unsubscribe',
  },
} satisfies TemplateEntry

/* ─── Styles ─── */
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 6px', lineHeight: '1.2' }
const h2 = { fontSize: '16px', fontWeight: 'normal', color: '#5d6b7a', margin: '0 0 20px', lineHeight: '1.4' }
const statsBox = {
  backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '8px',
  padding: '10px 14px', margin: '0 0 20px',
}
const statsText = { fontSize: '12px', color: '#5d6b7a', margin: 0, fontWeight: 600 as const, letterSpacing: '0.04em' }
const aiBodyBox = { margin: '0 0 24px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.65', margin: '0 0 12px' }
const ulStyle = { margin: '0 0 12px', padding: '0 0 0 20px' }
const liStyle = { fontSize: '14px', color: '#3c4858', lineHeight: '1.65', margin: '0 0 6px' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const ctaWrap = { textAlign: 'center' as const, margin: '0 0 12px' }
const primaryBtn = {
  backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px',
  fontSize: '15px', fontWeight: 'bold', textDecoration: 'none',
}
const subtle = { fontSize: '12px', color: '#8898aa', textAlign: 'center' as const, margin: '0 0 4px' }
const link = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
const footerLink = { color: '#8898aa', textDecoration: 'underline' }
