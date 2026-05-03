/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni AI'

interface Props {
  /** First name if known. */
  firstName?: string
  /** URL back to /topuni-ai with the brief loaded. */
  briefUrl: string
  /** URL to /pricing — the conversion target. */
  pricingUrl: string
  /** What the student is targeting, surfaced in the body for personalization. */
  major?: string
  targetCountries?: string[]
  /** N days since their basic brief was generated. */
  daysSinceBrief?: number
  /** Whether founding-cohort discount is still available. Caller decides. */
  foundingDiscountActive?: boolean
}

const ProUpgradeNudgeEmail = ({
  firstName,
  briefUrl,
  pricingUrl,
  major,
  targetCountries,
  daysSinceBrief,
  foundingDiscountActive = true,
}: Props) => {
  const greeting = firstName
    ? `${firstName}, your basic brief is just the surface.`
    : 'Your basic brief is just the surface.'

  const targetLine = (() => {
    const parts: string[] = []
    if (major) parts.push(major)
    if (targetCountries && targetCountries.length > 0) parts.push(`for ${targetCountries.slice(0, 2).join(' & ')}`)
    return parts.join(' ')
  })()

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>The Pro brief adds Career ROI, Visa Pathway, Combined Funding scenarios — all the strategy depth premium consultants charge $5K for.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>TopUni Pro · Strategy Brief Upgrade</Text>
          <Heading style={h1}>{greeting}</Heading>

          {targetLine && (
            <Text style={subline}>You read your basic brief{daysSinceBrief ? ` ${daysSinceBrief} days ago` : ''} — built for {targetLine}.</Text>
          )}

          <Text style={bodyText}>
            The basic brief gave you a strategic positioning paragraph, a university shortlist, and a 90-day action plan. That's the table-stakes. The <strong>Pro brief</strong> goes much deeper, and it's what every student we've talked to says made the difference between "I have a list" and "I have a strategy."
          </Text>

          <Section style={diffCard}>
            <Heading style={h3}>What Pro adds on top</Heading>

            <Section style={diffRow}>
              <Text style={diffLabel}>Career ROI breakdown</Text>
              <Text style={diffDesc}>
                For each of your top-3 universities: starting salary range in {major || 'your field'}, employment rate within 6 months, notable employers, where alumni are 5–10 years later.
              </Text>
            </Section>

            <Section style={diffRow}>
              <Text style={diffLabel}>Combined funding scenarios</Text>
              <Text style={diffDesc}>
                2–3 plausible stacks of scholarships + need-based aid + country-specific programs that could fully fund you. Total funding for each scenario.
              </Text>
            </Section>

            <Section style={diffRow}>
              <Text style={diffLabel}>Visa & post-graduation pathway</Text>
              <Text style={diffDesc}>
                Per-country visa difficulty for your nationality, post-study work permit details, path to permanent residency. Realistic challenges to plan for.
              </Text>
            </Section>

            <Section style={diffRow}>
              <Text style={diffLabel}>Three personalized essay angles</Text>
              <Text style={diffDesc}>
                Anchored to your specific profile + activities. Each angle is matched to which 2–3 target universities it plays best to and why.
              </Text>
            </Section>

            <Section style={{ ...diffRow, borderBottom: 'none' }}>
              <Text style={diffLabel}>Monthly budget breakdown</Text>
              <Text style={diffDesc}>
                For your top 3 cities: rent, food, transport, insurance — realistic ranges. Part-time work options. How scholarship coverage maps onto total cost.
              </Text>
            </Section>
          </Section>

          <Section style={btnWrap}>
            <Button href={pricingUrl} style={primaryBtn}>
              {foundingDiscountActive ? 'Upgrade — see founding cohort discount' : 'Upgrade to Pro'}
            </Button>
            <Text style={subtle}>
              <a href={briefUrl} style={subtleLink}>Reread your basic brief →</a>
            </Text>
          </Section>

          <Hr style={hr} />

          <Heading style={h3}>The math</Heading>
          <Text style={bodyText}>
            <strong>Private consultants:</strong> $5,000–$15,000 for one application year, single-shot strategy session, no live workshops.<br /><br />
            <strong>TopUni Pro:</strong> $39/month, the full strategy report, the verified scholarship database with how-to-win notes, monthly live workshops with founders from Yale / Cambridge / Harvard, and the recordings library forever. 30-day money-back guarantee.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Reply to this email if you want a second opinion before upgrading — we'll read your basic brief and tell you honestly whether Pro is worth it for your situation.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProUpgradeNudgeEmail,
  subject: ((data: Record<string, any>) => {
    const name = data.firstName || ''
    if (data.foundingDiscountActive) {
      return name
        ? `${name}, your Pro brief upgrade is waiting (founding cohort discount)`
        : `Your Pro brief upgrade is waiting (founding cohort discount)`
    }
    return name
      ? `${name}, ready for the Pro version of your brief?`
      : `Ready for the Pro version of your brief?`
  }),
  displayName: 'Pro brief upgrade nudge (Day 5)',
  previewData: {
    firstName: 'Aizada',
    briefUrl: 'https://topuni.org/topuni-ai',
    pricingUrl: 'https://topuni.org/pricing',
    major: 'Computer Science',
    targetCountries: ['United Kingdom', 'Germany'],
    daysSinceBrief: 5,
    foundingDiscountActive: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '4px 0 8px', lineHeight: '1.25' }
const h3 = { fontSize: '13px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }
const subline = { fontSize: '14px', color: '#5d6b7a', margin: '0 0 20px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#b8860b', textTransform: 'uppercase' as const, letterSpacing: '0.18em', margin: '0 0 6px' }
const bodyText = { fontSize: '14px', color: '#3c4858', lineHeight: '1.7', margin: '0 0 14px' }
const diffCard = { backgroundColor: '#fafbfc', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '20px 22px', margin: '18px 0 24px' }
const diffRow = { borderBottom: '1px solid #e6ebf1', paddingBottom: '14px', marginBottom: '14px' }
const diffLabel = { fontSize: '14px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 4px' }
const diffDesc = { fontSize: '13px', color: '#3c4858', lineHeight: '1.55', margin: '0' }
const subtle = { fontSize: '13px', color: '#8898aa', textAlign: 'center' as const, margin: '12px 0 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '20px 0 4px' }
const primaryBtn = { backgroundColor: '#b8860b', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
