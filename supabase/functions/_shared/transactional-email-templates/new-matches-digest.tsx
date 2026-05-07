/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

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
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    leadOne: (s: string) => `1 new scholarship just matched your "${s}" search.`,
    leadMany: (n: number, s: string) => `${n} new scholarships just matched your "${s}" search.`,
    headingNamed: (n: string, total: number) =>
      `${n}, ${total === 1 ? 'a new match for your saved search.' : 'new matches for your saved search.'}`,
    headingNeutral: (total: number) =>
      `Hi, ${total === 1 ? 'a new match for your saved search.' : 'new matches for your saved search.'}`,
    openLabel: 'Open',
    deadlineLabel: 'Deadline',
    openApp: 'Open the application →',
    moreCount: (n: number) => `+ ${n} more match${n === 1 ? '' : 'es'}.`,
    seeAll: 'See all on Discover →',
    cta: 'Open this search on Discover',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Pause this saved search',
    footerPauseSuffix: ' from your account.',
    teamSignoff: '— The TopUni Team',
    subjectOne: (s: string) => `1 new match for "${s}"`,
    subjectMany: (n: number, s: string) => `${n} new matches for "${s}"`,
    fallbackSearch: 'your saved search',
  },
  ru: {
    htmlLang: 'ru',
    leadOne: (s: string) => `Новая стипендия совпала с вашим поиском «${s}».`,
    leadMany: (n: number, s: string) => `${n} новых стипендий совпало с вашим поиском «${s}».`,
    headingNamed: (n: string, total: number) =>
      `${n}, ${total === 1 ? 'новое совпадение по вашему поиску.' : 'новые совпадения по вашему поиску.'}`,
    headingNeutral: (total: number) =>
      `Привет — ${total === 1 ? 'новое совпадение по вашему поиску.' : 'новые совпадения по вашему поиску.'}`,
    openLabel: 'Открытый',
    deadlineLabel: 'Дедлайн',
    openApp: 'Открыть заявку →',
    moreCount: (n: number) => `+ ещё ${n}.`,
    seeAll: 'Все совпадения в Discover →',
    cta: 'Открыть этот поиск в Discover',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Поставить этот поиск на паузу',
    footerPauseSuffix: ' в настройках аккаунта.',
    teamSignoff: '— Команда TopUni',
    subjectOne: (s: string) => `Новое совпадение по «${s}»`,
    subjectMany: (n: number, s: string) => `${n} новых совпадений по «${s}»`,
    fallbackSearch: 'ваш сохранённый поиск',
  },
} as const

const NewMatchesDigestEmail = ({
  name,
  searchName,
  searchUrl,
  matches,
  totalNew,
  manageUrl,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const lead = totalNew === 1 ? c.leadOne(searchName) : c.leadMany(totalNew, searchName)

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{lead}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {name ? c.headingNamed(name, totalNew) : c.headingNeutral(totalNew)}
          </Heading>
          <Text style={leadText}>{lead}</Text>

          <Section style={card}>
            {matches.slice(0, 8).map((m, i) => (
              <Section key={i} style={i === 0 ? rowFirst : row}>
                <Text style={kicker}>{m.hostCountry || c.openLabel}{m.coverage ? ` · ${m.coverage}` : ''}</Text>
                <Heading style={h2}>{m.name}</Heading>
                {m.amount && <Text style={amountText}>{m.amount}</Text>}
                {m.deadline && <Text style={deadlineText}>{c.deadlineLabel}: <strong>{m.deadline}</strong></Text>}
                {m.url && (
                  <Text style={linkText}>
                    <a href={m.url} style={subtleLink}>{c.openApp}</a>
                  </Text>
                )}
              </Section>
            ))}
          </Section>

          {matches.length > 8 && (
            <Text style={subtle}>
              {c.moreCount(totalNew - 8)}{' '}
              <a href={searchUrl} style={subtleLink}>{c.seeAll}</a>
            </Text>
          )}

          <Section style={btnWrap}>
            <Button href={searchUrl} style={primaryBtn}>{c.cta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            {c.footerPause}<a href={manageUrl} style={subtleLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
          </Text>
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewMatchesDigestEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    const total = Number(data.totalNew) || 0
    const label = data.searchName || c.fallbackSearch
    if (total === 1) return c.subjectOne(label)
    return c.subjectMany(total, label)
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
    language: 'en',
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
