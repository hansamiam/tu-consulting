/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

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
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'The Pro brief adds Career ROI, Visa Pathway, Combined Funding scenarios — all the strategy depth premium consultants charge $5K for.',
    kicker: 'TopUni Pro · Strategy Brief Upgrade',
    headingNamed: (n: string) => `${n}, your basic brief is just the surface.`,
    headingNeutral: 'Your basic brief is just the surface.',
    sublineFn: (target: string, days: number | undefined) =>
      `You read your basic brief${days ? ` ${days} days ago` : ''} — built for ${target}.`,
    forCountries: (cs: string) => `for ${cs}`,
    intro: "The basic brief gave you a strategic positioning paragraph, a university shortlist, and a funding pathway. That's the table-stakes. The full brief goes much deeper, and it's what every student we've talked to says made the difference between \"I have a list\" and \"I have a strategy.\"",
    introBoldMarker: 'full brief',
    diffTitle: 'What Pro adds on top',
    diff1Label: 'Career ROI breakdown',
    diff1Desc: (m: string) =>
      `For each of your top-3 universities: starting salary range in ${m}, employment rate within 6 months, notable employers, where alumni are 5–10 years later.`,
    diff2Label: 'Combined funding scenarios',
    diff2Desc: '2–3 plausible stacks of scholarships + need-based aid + country-specific programs that could fully fund you. Total funding for each scenario.',
    diff3Label: 'Visa & post-graduation pathway',
    diff3Desc: 'Per-country visa difficulty for your nationality, post-study work permit details, path to permanent residency. Realistic challenges to plan for.',
    diff4Label: 'Three personalized essay angles',
    diff4Desc: 'Anchored to your specific profile + activities. Each angle is matched to which 2–3 target universities it plays best to and why.',
    diff5Label: 'Monthly budget breakdown',
    diff5Desc: 'For your top 3 cities: rent, food, transport, insurance — realistic ranges. Part-time work options. How scholarship coverage maps onto total cost.',
    ctaWithDiscount: 'Upgrade — see founding cohort discount',
    ctaPlain: 'Upgrade to Pro',
    rereadCta: 'Reread your basic brief →',
    mathTitle: 'The math',
    mathConsultantsBold: 'Private consultants:',
    mathConsultantsBody: ' $5,000–$15,000 for one application year, single-shot strategy session, no live workshops.',
    mathProBold: 'TopUni Pro:',
    mathProBody: ' $39/month, the full strategy report, the verified scholarship database with how-to-win notes, monthly live workshops with founders from Yale / Cambridge / Harvard, and the recordings library forever. 30-day money-back guarantee.',
    secondOpinion: "Reply to this email if you want a second opinion before upgrading — we'll read your basic brief and tell you honestly whether Pro is worth it for your situation.",
    teamSignoff: '— The TopUni AI Team',
    fieldFallback: 'your field',
    subjectFn: (n: string, founding: boolean) =>
      founding
        ? n
          ? `${n}, your Pro brief upgrade is waiting (founding cohort discount)`
          : `Your Pro brief upgrade is waiting (founding cohort discount)`
        : n
          ? `${n}, ready for the Pro version of your brief?`
          : `Ready for the Pro version of your brief?`,
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Pro-брифинг добавляет Career ROI, визовый путь, сценарии комбинированного финансирования — глубину стратегии, за которую частные консультанты берут $5K.',
    kicker: 'TopUni Pro · Апгрейд брифинга',
    headingNamed: (n: string) => `${n}, базовый брифинг — это только поверхность.`,
    headingNeutral: 'Базовый брифинг — это только поверхность.',
    sublineFn: (target: string, days: number | undefined) =>
      `Вы прочитали базовый брифинг${days ? ` ${days} дн. назад` : ''} — подготовлен для: ${target}.`,
    forCountries: (cs: string) => `для ${cs}`,
    intro: 'Базовый брифинг дал вам стратегическое позиционирование, шорт-лист университетов и план финансирования. Это база. Полный брифинг идёт намного глубже — каждый студент, с которым мы общались, говорит, что именно он сделал разницу между «у меня есть список» и «у меня есть стратегия».',
    introBoldMarker: 'Полный брифинг',
    diffTitle: 'Что добавляет Pro',
    diff1Label: 'Career ROI — карьерный возврат',
    diff1Desc: (m: string) =>
      `Для каждого из топ-3 университетов: стартовая зарплата в области «${m}», % трудоустройства за 6 месяцев, ключевые работодатели, где выпускники через 5–10 лет.`,
    diff2Label: 'Сценарии комбинированного финансирования',
    diff2Desc: '2–3 реалистичных набора стипендий + need-based aid + страновых программ, которые могут полностью покрыть учёбу. Сумма по каждому сценарию.',
    diff3Label: 'Визовый путь и пост-учёба',
    diff3Desc: 'Сложность визы для вашей национальности по странам, пост-учебное разрешение на работу, путь к ПМЖ. Реальные сложности на пути.',
    diff4Label: 'Три персональных угла для эссе',
    diff4Desc: 'Привязаны к вашему профилю и активностям. Каждый угол сопоставлен с 2–3 университетами, где он сработает лучше всего.',
    diff5Label: 'Месячный бюджет',
    diff5Desc: 'Для топ-3 городов: аренда, еда, транспорт, страховка — реальные диапазоны. Варианты подработки. Как покрытие стипендии ложится на общую стоимость.',
    ctaWithDiscount: 'Апгрейд — со скидкой founding cohort',
    ctaPlain: 'Перейти на Pro',
    rereadCta: 'Перечитать базовый брифинг →',
    mathTitle: 'Математика',
    mathConsultantsBold: 'Частные консультанты:',
    mathConsultantsBody: ' $5 000–$15 000 за один цикл подачи, одна стратегическая сессия, без живых воркшопов.',
    mathProBold: 'TopUni Pro:',
    mathProBody: ' $39/мес, полный стратегический отчёт, проверенная база стипендий с заметками «как выиграть», ежемесячные живые воркшопы с выпускниками Yale / Cambridge / Harvard и архив записей навсегда. Возврат денег в течение 30 дней.',
    secondOpinion: 'Ответьте на это письмо, если хотите второе мнение перед апгрейдом — мы прочитаем ваш базовый брифинг и честно скажем, стоит ли Pro в вашей ситуации.',
    teamSignoff: '— Команда TopUni AI',
    fieldFallback: 'вашей области',
    subjectFn: (n: string, founding: boolean) =>
      founding
        ? n
          ? `${n}, апгрейд на Pro ждёт (скидка founding cohort)`
          : `Апгрейд на Pro ждёт (скидка founding cohort)`
        : n
          ? `${n}, готовы к Pro-версии брифинга?`
          : `Готовы к Pro-версии брифинга?`,
  },
} as const

const ProUpgradeNudgeEmail = ({
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

  // Render the intro with the bold marker emphasized.
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
  component: ProUpgradeNudgeEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    const name = data.firstName ? String(data.firstName) : ''
    return c.subjectFn(name, !!data.foundingDiscountActive)
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
