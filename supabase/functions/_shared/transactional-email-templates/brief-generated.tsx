/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni AI'

interface Props {
  /** First name if known. Falls back to a neutral greeting. */
  firstName?: string
  /** Public share URL — /brief/:slug */
  briefUrl: string
  /** Eyebrow stats line: "12 matches · $640K potential · earliest deadline 18 days" */
  statsLine?: string
  /** Top 3 matched scholarship names — rendered as a quick list */
  topMatches?: string[]
  /** Major + target country chips for personalization */
  major?: string
  targetCountries?: string[]
}

const BriefGeneratedEmail = ({
  firstName,
  briefUrl,
  statsLine,
  topMatches,
  major,
  targetCountries,
}: Props) => {
  const greeting = firstName ? `${firstName}, your strategy brief is ready.` : 'Your strategy brief is ready.'
  const targetLine = (() => {
    const parts: string[] = []
    if (major) parts.push(major)
    if (targetCountries && targetCountries.length > 0) parts.push(`for ${targetCountries.slice(0, 2).join(' & ')}`)
    return parts.join(' ')
  })()

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{statsLine || 'Your TopUni AI admissions strategy is ready to read.'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>TopUni AI · Strategy Brief</Text>
          <Heading style={h1}>{greeting}</Heading>

          {targetLine && (
            <Text style={subline}>Built for {targetLine}.</Text>
          )}

          {statsLine && (
            <Section style={statsCard}>
              <Text style={statsText}>{statsLine}</Text>
            </Section>
          )}

          <Section style={btnWrap}>
            <Button href={briefUrl} style={primaryBtn}>
              Open my brief
            </Button>
          </Section>

          {topMatches && topMatches.length > 0 && (
            <>
              <Hr style={hr} />
              <Heading style={h3}>Top scholarship matches</Heading>
              <Text style={text}>
                {topMatches.slice(0, 3).map((name, i) => (
                  <React.Fragment key={i}>
                    <strong>{i + 1}.</strong> {name}<br />
                  </React.Fragment>
                ))}
              </Text>
              <Text style={subtle}>
                <a href={briefUrl} style={subtleLink}>See all matches and the strategy →</a>
              </Text>
            </>
          )}

          <Hr style={hr} />
          <Heading style={h3}>What's inside</Heading>
          <Text style={text}>
            <strong>Strategic positioning</strong> — the angle you should lead with this cycle.<br />
            <strong>University shortlist</strong> — top fits, aligned options, worth-keeping-on-radar.<br />
            <strong>Funding pathway</strong> — exact scholarships, deadlines, and how to combine them.<br />
            <strong>3 essay angles</strong> — distinct concepts anchored in your story.<br />
            <strong>Honest gaps</strong> — what to close before you submit.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Save the link — your brief is permanent if you have an account, or stays live for 30 days otherwise.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BriefGeneratedEmail,
  subject: ((data: Record<string, any>) => {
    const name = data.firstName || ''
    const major = data.major ? ` ${data.major}` : ''
    return name
      ? `${name}, your${major} admissions brief is ready`
      : `Your${major} admissions brief is ready`
  }),
  displayName: 'Brief generated — open it now',
  previewData: {
    firstName: 'Aizada',
    briefUrl: 'https://topuni.org/brief/x7k2p9q4',
    statsLine: '12 matches · $640K potential funding · earliest deadline in 18 days',
    topMatches: ['Chevening Scholarships', 'DAAD Master Scholarship', 'Knight-Hennessy Scholars'],
    major: 'Computer Science',
    targetCountries: ['United Kingdom', 'Germany'],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '4px 0 8px', lineHeight: '1.25' }
const h3 = { fontSize: '13px', fontWeight: 'bold', color: '#0a2540', margin: '4px 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }
const subline = { fontSize: '14px', color: '#5d6b7a', margin: '0 0 16px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#b8860b', textTransform: 'uppercase' as const, letterSpacing: '0.18em', margin: '0 0 6px' }
const statsCard = { backgroundColor: '#fff8e7', border: '1px solid #f0d987', borderRadius: '10px', padding: '14px 16px', margin: '4px 0 22px' }
const statsText = { fontSize: '14px', color: '#7a5e0a', fontWeight: 'bold', margin: '0', lineHeight: '1.45' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.7', margin: '0 0 8px' }
const subtle = { fontSize: '13px', color: '#8898aa', margin: '12px 0 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '8px 0 4px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
