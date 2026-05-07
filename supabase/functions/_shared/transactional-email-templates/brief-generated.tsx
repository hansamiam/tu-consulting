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
  /** "ru" → render the Russian variant, anything else → English. */
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    kicker: 'TopUni AI · Strategy Brief',
    greetingNamed: (n: string) => `${n}, your strategy brief is ready.`,
    greetingNeutral: 'Your strategy brief is ready.',
    builtFor: (s: string) => `Built for ${s}.`,
    forCountries: (cs: string) => `for ${cs}`,
    previewFallback: 'Your TopUni AI admissions strategy is ready to read.',
    openBrief: 'Open my brief',
    topMatches: 'Top scholarship matches',
    seeAll: 'See all matches and the strategy →',
    insideTitle: "What's inside",
    insideRows: [
      ['Strategic positioning', 'the angle you should lead with this cycle.'],
      ['University shortlist', 'top fits, aligned options, worth-keeping-on-radar.'],
      ['Funding pathway', 'exact scholarships, deadlines, and how to combine them.'],
      ['3 essay angles', 'distinct concepts anchored in your story.'],
      ['Honest gaps', 'what to close before you submit.'],
    ] as const,
    saveLink: 'Save the link — your brief is permanent if you have an account, or stays live for 30 days otherwise.',
    teamSignoff: '— The TopUni AI Team',
    htmlLang: 'en',
  },
  ru: {
    kicker: 'TopUni AI · Стратегический брифинг',
    greetingNamed: (n: string) => `${n}, ваш стратегический брифинг готов.`,
    greetingNeutral: 'Ваш стратегический брифинг готов.',
    builtFor: (s: string) => `Подготовлен для: ${s}.`,
    forCountries: (cs: string) => `для ${cs}`,
    previewFallback: 'Ваш брифинг TopUni AI готов к прочтению.',
    openBrief: 'Открыть брифинг',
    topMatches: 'Лучшие стипендии',
    seeAll: 'Все совпадения и стратегия →',
    insideTitle: 'Что внутри',
    insideRows: [
      ['Стратегическое позиционирование', 'ваш главный угол подачи в этом цикле.'],
      ['Шорт-лист университетов', 'лучшие совпадения, альтернативы и резервные варианты.'],
      ['План финансирования', 'конкретные стипендии, дедлайны и как их комбинировать.'],
      ['3 угла для эссе', 'разные концепции, основанные на вашей истории.'],
      ['Честные пробелы', 'что закрыть до подачи.'],
    ] as const,
    saveLink: 'Сохраните ссылку — брифинг хранится бессрочно при наличии аккаунта или 30 дней без него.',
    teamSignoff: '— Команда TopUni AI',
    htmlLang: 'ru',
  },
} as const

const BriefGeneratedEmail = ({
  firstName,
  briefUrl,
  statsLine,
  topMatches,
  major,
  targetCountries,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const greeting = firstName ? c.greetingNamed(firstName) : c.greetingNeutral
  const targetLine = (() => {
    const parts: string[] = []
    if (major) parts.push(major)
    if (targetCountries && targetCountries.length > 0) {
      parts.push(c.forCountries(targetCountries.slice(0, 2).join(' & ')))
    }
    return parts.join(' ')
  })()

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{statsLine || c.previewFallback}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>{c.kicker}</Text>
          <Heading style={h1}>{greeting}</Heading>

          {targetLine && (
            <Text style={subline}>{c.builtFor(targetLine)}</Text>
          )}

          {statsLine && (
            <Section style={statsCard}>
              <Text style={statsText}>{statsLine}</Text>
            </Section>
          )}

          <Section style={btnWrap}>
            <Button href={briefUrl} style={primaryBtn}>
              {c.openBrief}
            </Button>
          </Section>

          {topMatches && topMatches.length > 0 && (
            <>
              <Hr style={hr} />
              <Heading style={h3}>{c.topMatches}</Heading>
              <Text style={text}>
                {topMatches.slice(0, 3).map((name, i) => (
                  <React.Fragment key={i}>
                    <strong>{i + 1}.</strong> {name}<br />
                  </React.Fragment>
                ))}
              </Text>
              <Text style={subtle}>
                <a href={briefUrl} style={subtleLink}>{c.seeAll}</a>
              </Text>
            </>
          )}

          <Hr style={hr} />
          <Heading style={h3}>{c.insideTitle}</Heading>
          <Text style={text}>
            {c.insideRows.map(([label, body], i) => (
              <React.Fragment key={i}>
                <strong>{label}</strong> — {body}<br />
              </React.Fragment>
            ))}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>{c.saveLink}</Text>
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BriefGeneratedEmail,
  subject: ((data: Record<string, any>) => {
    const isRu = data.language === 'ru'
    const name = data.firstName || ''
    const major = data.major ? ` ${data.major}` : ''
    if (isRu) {
      return name
        ? `${name}, ваш${major ? ' брифинг' : ' стратегический брифинг'} готов`
        : `Ваш${major ? ' брифинг' : ' стратегический брифинг'} готов`
    }
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
    language: 'en',
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
