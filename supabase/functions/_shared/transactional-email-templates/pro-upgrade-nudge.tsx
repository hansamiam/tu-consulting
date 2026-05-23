/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// File + template-key name kept as `pro-upgrade-nudge` to avoid
// renaming the cron function (`pro-upgrade-nudge-cron`) and the
// DB column (`pro_nudge_sent_at`). Content is the locked
// Membership pitch per the stage-2 spec (Brief stays free; the
// nudge sells the Membership bundle: unlimited saves +
// per-scholarship insights + Pipeline + Academy).

interface Props {
  /** First name if known. */
  firstName?: string
  /** URL back to /topuni-ai with the brief loaded (re-read entry point). */
  briefUrl: string
  /** URL to /pricing — the conversion target. */
  pricingUrl: string
  /** What the student is targeting, surfaced in the body for personalization. */
  major?: string
  targetCountries?: string[]
  /** N days since their brief was generated. */
  daysSinceBrief?: number
  /** Whether founding-cohort discount is still available. Caller decides. */
  foundingDiscountActive?: boolean
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'Brief stays yours, free. Membership is what happens next — unlimited Discover saves, per-scholarship insights, and the workspace to track every deadline.',
    kicker: 'TopUni Membership · Discover · Pipeline · Academy',
    headingNamed: (n: string) => `${n}, your brief is yours. Membership is what comes after.`,
    headingNeutral: 'Your brief is yours. Membership is what comes after.',
    sublineFn: (target: string, days: number | undefined) =>
      `You read your strategy${days ? ` ${days} days ago` : ''}${target ? ` — built for ${target}` : ''}.`,
    forCountries: (cs: string) => `for ${cs}`,
    intro: 'The brief told you who you already are and where to look. Members do the next part — saving every scholarship that fits, getting personalized "why this fits / how to win" notes on each, and tracking deadlines without losing one.',
    introBoldMarker: 'who you already are',
    diffTitle: 'What Membership unlocks',
    diff1Label: 'Unlimited Discover saves',
    diff1Desc: (m: string) =>
      `Save every scholarship that matches your ${m || 'profile'} — not just the first five. The Discover scoring engine keeps surfacing new ones every week.`,
    diff2Label: 'Per-scholarship insights',
    diff2Desc: '"Why this fits you" + "How to win this one" on every row you save. Specific pointers ("your IELTS 7.0 is below their 7.5 threshold — bump it or skip"), not generic fluff.',
    diff3Label: 'Workspace — kanban + deadlines',
    diff3Desc: 'Drag scholarships through the application stages. Calendar view of every deadline, synced to your Google or Apple Calendar so the dates fire on your phone.',
    diff4Label: 'Live monthly workshops',
    diff4Desc: 'Yale, Cambridge & Tsinghua, Harvard alumni run live sessions every month — essay clinics, scholarship strategy, country deep-dives.',
    diff5Label: 'Recordings library, kept forever',
    diff5Desc: 'Miss one? Catch up. The library compounds with every cohort — search past sessions by country, by scholarship, by topic.',
    ctaWithDiscount: 'Become a member — early-access discount applies',
    ctaPlain: 'Become a member',
    rereadCta: 'Reread your strategy →',
    mathTitle: 'The math',
    mathConsultantsBold: 'Private consultants:',
    mathConsultantsBody: ' $5,000–$15,000 for one application cycle, single-shot strategy session, no recurring access.',
    mathProBold: 'TopUni Membership:',
    mathProBody: ' $39/month — unlimited Discover saves, per-scholarship insights, the workspace, the monthly workshops, the recordings library. 30-day money-back guarantee.',
    secondOpinion: "Reply to this email if you want a second opinion before becoming a member — we'll read your strategy and tell you honestly whether the saves + insights + workspace would change anything in your cycle.",
    teamSignoff: '— The TopUni Team',
    fieldFallback: 'profile',
    subjectFn: (n: string, founding: boolean) =>
      founding
        ? n
          ? `${n}, members save 5+ scholarships (early-access discount still on)`
          : `Members save 5+ scholarships (early-access discount still on)`
        : n
          ? `${n}, ready to save more than 5 scholarships?`
          : `Ready to save more than 5 scholarships?`,
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Брифинг — твой, бесплатно. Членство — это то, что дальше: безлимит сохранений в Discover, инсайты по каждой стипендии и рабочая зона со всеми дедлайнами.',
    kicker: 'TopUni Membership · Discover · Pipeline · Academy',
    headingNamed: (n: string) => `${n}, брифинг — твой. Членство — это то, что дальше.`,
    headingNeutral: 'Брифинг — твой. Членство — это то, что дальше.',
    sublineFn: (target: string, days: number | undefined) =>
      `Ты прочитал стратегию${days ? ` ${days} дн. назад` : ''}${target ? ` — подготовлена для: ${target}` : ''}.`,
    forCountries: (cs: string) => `для ${cs}`,
    intro: 'Брифинг назвал, кто ты уже сейчас, и куда смотреть. Участники делают следующий шаг — сохраняют каждую подходящую стипендию, получают персональные заметки «почему подходит / как выиграть» по каждой и не теряют ни одного дедлайна.',
    introBoldMarker: 'кто ты уже сейчас',
    diffTitle: 'Что открывает Членство',
    diff1Label: 'Безлимит сохранений в Discover',
    diff1Desc: (m: string) =>
      `Сохраняй каждую стипендию, подходящую твоему ${m || 'профилю'} — не только первые пять. Discover каждую неделю подгоняет новые.`,
    diff2Label: 'Инсайты по каждой стипендии',
    diff2Desc: '«Почему подходит именно тебе» + «Как выиграть эту» на каждой сохранённой строке. Конкретные указания («твой IELTS 7.0 ниже их порога 7.5 — подтяни или пропусти»), а не общие фразы.',
    diff3Label: 'Рабочая зона — канбан + дедлайны',
    diff3Desc: 'Перетаскивай стипендии по этапам подачи. Календарь дедлайнов, синхронизированный с Google или Apple Calendar — даты приходят на телефон.',
    diff4Label: 'Воркшопы с основателями вживую',
    diff4Desc: 'Выпускники Yale, Cambridge & Tsinghua, Harvard ведут сессии каждый месяц — эссе-клиники, стратегия, страновые разборы.',
    diff5Label: 'Библиотека записей навсегда',
    diff5Desc: 'Пропустил? Догонишь. Библиотека пополняется каждую когорту — ищи прошлые сессии по стране, стипендии, теме.',
    ctaWithDiscount: 'Стать участником — скидка раннего доступа в силе',
    ctaPlain: 'Стать участником',
    rereadCta: 'Перечитать стратегию →',
    mathTitle: 'Математика',
    mathConsultantsBold: 'Частные консультанты:',
    mathConsultantsBody: ' $5 000–$15 000 за один цикл подачи, одна стратегическая сессия, без регулярного доступа.',
    mathProBold: 'TopUni Membership:',
    mathProBody: ' $39/мес — безлимит сохранений в Discover, инсайты по каждой стипендии, рабочая зона, ежемесячные воркшопы, архив записей. Возврат денег в течение 30 дней.',
    secondOpinion: 'Ответь на это письмо, если хочешь второе мнение перед оплатой — прочитаем твою стратегию и честно скажем, изменит ли что-то в твоём цикле членство.',
    teamSignoff: '— Команда TopUni',
    fieldFallback: 'профилю',
    subjectFn: (n: string, founding: boolean) =>
      founding
        ? n
          ? `${n}, участники сохраняют 5+ стипендий (скидка раннего доступа ещё в силе)`
          : `Участники сохраняют 5+ стипендий (скидка раннего доступа ещё в силе)`
        : n
          ? `${n}, готов сохранять больше 5 стипендий?`
          : `Готов сохранять больше 5 стипендий?`,
  },
} as const

const MembershipUpgradeNudgeEmail = ({
  firstName,
  briefUrl,
  pricingUrl,
  major,
  targetCountries,
  daysSinceBrief,
  foundingDiscountActive = true,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const greeting = firstName ? c.headingNamed(firstName) : c.headingNeutral

  const targetLine = (() => {
    const parts: string[] = []
    if (major) parts.push(major)
    if (targetCountries && targetCountries.length > 0) parts.push(c.forCountries(targetCountries.slice(0, 2).join(' & ')))
    return parts.join(' ')
  })()

  const introParts = c.intro.split(c.introBoldMarker)

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={kicker}>{c.kicker}</Text>
          <Heading style={h1}>{greeting}</Heading>

          {targetLine && (
            <Text style={subline}>{c.sublineFn(targetLine, daysSinceBrief)}</Text>
          )}

          <Text style={bodyText}>
            {introParts[0]}<strong>{c.introBoldMarker}</strong>{introParts.slice(1).join(c.introBoldMarker)}
          </Text>

          <Section style={diffCard}>
            <Heading style={h3}>{c.diffTitle}</Heading>

            <Section style={diffRow}>
              <Text style={diffLabel}>{c.diff1Label}</Text>
              <Text style={diffDesc}>{c.diff1Desc(major || c.fieldFallback)}</Text>
            </Section>

            <Section style={diffRow}>
              <Text style={diffLabel}>{c.diff2Label}</Text>
              <Text style={diffDesc}>{c.diff2Desc}</Text>
            </Section>

            <Section style={diffRow}>
              <Text style={diffLabel}>{c.diff3Label}</Text>
              <Text style={diffDesc}>{c.diff3Desc}</Text>
            </Section>

            <Section style={diffRow}>
              <Text style={diffLabel}>{c.diff4Label}</Text>
              <Text style={diffDesc}>{c.diff4Desc}</Text>
            </Section>

            <Section style={{ ...diffRow, borderBottom: 'none' }}>
              <Text style={diffLabel}>{c.diff5Label}</Text>
              <Text style={diffDesc}>{c.diff5Desc}</Text>
            </Section>
          </Section>

          <Section style={btnWrap}>
            <Button href={pricingUrl} style={primaryBtn}>
              {foundingDiscountActive ? c.ctaWithDiscount : c.ctaPlain}
            </Button>
            <Text style={subtle}>
              <a href={briefUrl} style={subtleLink}>{c.rereadCta}</a>
            </Text>
          </Section>

          <Hr style={hr} />

          <Heading style={h3}>{c.mathTitle}</Heading>
          <Text style={bodyText}>
            <strong>{c.mathConsultantsBold}</strong>{c.mathConsultantsBody}<br /><br />
            <strong>{c.mathProBold}</strong>{c.mathProBody}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>{c.secondOpinion}</Text>
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MembershipUpgradeNudgeEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    const name = data.firstName ? String(data.firstName) : ''
    return c.subjectFn(name, !!data.foundingDiscountActive)
  }),
  displayName: 'Membership upgrade nudge (Day 5)',
  previewData: {
    firstName: 'Aizada',
    briefUrl: 'https://topuni.org/topuni-ai',
    pricingUrl: 'https://topuni.org/pricing',
    major: 'Computer Science',
    targetCountries: ['United Kingdom', 'Germany'],
    daysSinceBrief: 5,
    foundingDiscountActive: true,
    language: 'en',
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
