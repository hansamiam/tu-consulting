/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni'

interface MatchLite {
  name: string
  hostCountry?: string
  coverage?: string
  deadline?: string
  url?: string
  amount?: string
}

interface Props {
  name?: string
  searchName: string
  searchUrl: string
  matches: MatchLite[]
  totalNew: number
  manageUrl: string
}

const NewMatchesDigestEmail = ({
  name,
  searchName,
  searchUrl,
  matches,
  totalNew,
  manageUrl,
}: Props) => {
  const lead =
    totalNew === 1
      ? `1 new scholarship just matched your "${searchName}" search.`
      : `${totalNew} new scholarships just matched your "${searchName}" search.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{lead}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {name ? `${name},` : 'Hi,'} {totalNew === 1 ? 'a new match for your saved search.' : 'new matches for your saved search.'}
          </Heading>
          <Text style={leadText}>{lead}</Text>

          <Section style={card}>
            {matches.slice(0, 8).map((m, i) => (
              <Section key={i} style={i === 0 ? rowFirst : row}>
                <Text style={kicker}>{m.hostCountry || 'Open'}{m.coverage ? ` · ${m.coverage}` : ''}</Text>
                <Heading style={h2}>{m.name}</Heading>
                {m.amount && <Text style={amountText}>{m.amount}</Text>}
                {m.deadline && <Text style={deadlineText}>Deadline: <strong>{m.deadline}</strong></Text>}
                {m.url && (
                  <Text style={linkText}>
                    <a href={m.url} style={subtleLink}>Open the application →</a>
                  </Text>
                )}
              </Section>
            ))}
          </Section>

          {matches.length > 8 && (
            <Text style={subtle}>
              + {totalNew - 8} more match{totalNew - 8 === 1 ? '' : 'es'}.{' '}
              <a href={searchUrl} style={subtleLink}>See all on Discover →</a>
            </Text>
          )}

          <Section style={btnWrap}>
            <Button href={searchUrl} style={primaryBtn}>
              Open this search on Discover
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Don't want these? <a href={manageUrl} style={subtleLink}>Pause this saved search</a> from your account.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewMatchesDigestEmail,
  subject: ((data: Record<string, any>) => {
    const total = Number(data.totalNew) || 0
    const label = data.searchName || 'your saved search'
    if (total === 1) return `1 new match for "${label}"`
    return `${total} new matches for "${label}"`
  }),
  displayName: 'Saved-search new matches',
  previewData: {
    name: 'Aigerim',
    searchName: 'PhD scholarships in Germany',
    searchUrl: 'https://topuni.org/discover',
    manageUrl: 'https://topuni.org/account?action=saved-searches',
    totalNew: 3,
    matches: [
      { name: 'DAAD Helmut Schmidt Programme', hostCountry: 'Germany', coverage: 'Full ride', deadline: 'July 31, 2026', amount: 'Full tuition + €1,000 stipend', url: 'https://example.com' },
      { name: 'Heinrich Böll Foundation Scholarship', hostCountry: 'Germany', coverage: 'Stipend', deadline: 'September 1, 2026', url: 'https://example.com' },
      { name: 'Konrad-Adenauer-Stiftung PhD', hostCountry: 'Germany', coverage: 'Stipend', url: 'https://example.com' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 4px', lineHeight: '1.25' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', margin: '0 0 18px' }
const row = { padding: '16px 18px', borderTop: '1px solid #e6ebf1' }
const rowFirst = { padding: '16px 18px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px' }
const amountText = { fontSize: '13px', color: '#5d6b7a', margin: '0 0 6px' }
const deadlineText = { fontSize: '13px', color: '#3c4858', margin: '0 0 6px' }
const linkText = { fontSize: '13px', margin: '6px 0 0' }
const leadText = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 18px' }
const subtle = { fontSize: '13px', color: '#8898aa', textAlign: 'center' as const, margin: '8px 0 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '20px 0 6px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0 18px' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
