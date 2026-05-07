/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  trackedCount: number
  upcomingDeadlineCount: number
  pipelineUrl: string
  discoverUrl: string
  manageUrl: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    previewNamed: (n: string) => `${n}, week 1 check-in`,
    previewNeutral: 'Week 1 check-in',
    headingNamed: (n: string) => `${n}, your first week.`,
    headingNeutral: 'Hi, your first week.',
    leadZero: "A week in. You haven't saved anything yet — totally fine, it just means we don't have a plan to react to. The fastest way out of \"thinking about it\" is to save 3 scholarships and let Pipeline do the deadline-tracking for you.",
    leadOne: "A week in. One scholarship saved. The students who actually convert tend to have 5–8 in active rotation — gives the pipeline real signal and means you're not pinning everything on a single decision.",
    leadMany: (count: number, urgent: number) =>
      `A week in. ${count} scholarships saved${urgent > 0 ? `, ${urgent} with deadlines in the next 30 days` : ''}. Now the work is iterating on essays + tracking status — the membership is built for exactly this stretch.`,
    nextStepKicker: 'Most-leveraged next step',
    nextStepZero: 'Open Discover and save 3',
    nextStepFew: 'Add 2-3 more to Pipeline',
    nextStepEnough: 'Open Pipeline · what changed',
    nextStepCta: 'Go',
    patternsTitle: 'Two patterns from members who win',
    pattern1Bold: '1. Volume early, edit late.',
    pattern1Body: 'Save broadly the first two weeks; cull aggressively in week three. Trying to pick perfectly upfront is how you miss good fits.',
    pattern2Bold: '2. Draft openings before you commit.',
    pattern2Body: 'Inside any saved scholarship\'s Pipeline row, the "Get 3 starting drafts" button gives you three opening angles. Use it to test which scholarship\'s prompt actually has something to say back.',
    footerPause: "Don't want check-ins? ",
    footerPauseLink: 'Pause from your account',
    footerPauseSuffix: '.',
    teamSignoff: '— The TopUni Team',
    subjectZero: (n: string) => `${n ? `${n}, ` : ''}week 1 — let's get you a plan`,
    subjectMany: (n: string, c: number) => `${n ? `${n}, ` : ''}week 1 check-in (${c} saved)`,
  },
  ru: {
    htmlLang: 'ru',
    previewNamed: (n: string) => `${n}, итоги первой недели`,
    previewNeutral: 'Итоги первой недели',
    headingNamed: (n: string) => `${n}, ваша первая неделя.`,
    headingNeutral: 'Привет — ваша первая неделя.',
    leadZero: 'Неделя прошла. Вы пока ничего не сохранили — это нормально, просто нам не на что реагировать. Самый быстрый способ выйти из режима «думаю» — сохранить 3 стипендии и поручить Pipeline вести дедлайны.',
    leadOne: 'Неделя прошла. Одна стипендия сохранена. У тех, кто реально побеждает, обычно 5–8 в активной работе — это даёт системе сигнал и снимает давление одного-единственного решения.',
    leadMany: (count: number, urgent: number) =>
      `Неделя прошла. Сохранено ${count} стипендий${urgent > 0 ? `, у ${urgent} дедлайн в ближайшие 30 дней` : ''}. Теперь работа — это итерация по эссе и отслеживание статусов. Подписка как раз для этого этапа.`,
    nextStepKicker: 'Самый важный следующий шаг',
    nextStepZero: 'Открыть Discover и сохранить 3',
    nextStepFew: 'Добавить ещё 2-3 в Pipeline',
    nextStepEnough: 'Открыть Pipeline · что изменилось',
    nextStepCta: 'Перейти',
    patternsTitle: 'Два паттерна тех, кто побеждает',
    pattern1Bold: '1. Объём в начале, отбор в конце.',
    pattern1Body: 'Сохраняйте широко первые две недели, жёстко отсеивайте на третьей. Идеальный выбор сразу — это как пропустить хорошие варианты.',
    pattern2Bold: '2. Наброски эссе до решения подавать.',
    pattern2Body: 'В каждой сохранённой стипендии в Pipeline есть кнопка «3 стартовых наброска» — она даёт три угла открытия. Используйте, чтобы понять, на какую тему вам реально есть что сказать.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Поставить на паузу',
    footerPauseSuffix: '.',
    teamSignoff: '— Команда TopUni',
    subjectZero: (n: string) => `${n ? `${n}, ` : ''}неделя 1 — соберём план`,
    subjectMany: (n: string, c: number) => `${n ? `${n}, ` : ''}неделя 1 (сохранено: ${c})`,
  },
} as const

const ActivationDay7Email = ({ name, trackedCount, upcomingDeadlineCount, pipelineUrl, discoverUrl, manageUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const lead = trackedCount === 0 ? c.leadZero
             : trackedCount === 1 ? c.leadOne
             : c.leadMany(trackedCount, upcomingDeadlineCount)

  const nextStepLabel = trackedCount === 0 ? c.nextStepZero
                      : trackedCount < 5 ? c.nextStepFew
                      : c.nextStepEnough
  const nextStepHref = trackedCount === 0 || trackedCount < 5 ? discoverUrl : pipelineUrl

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{name ? c.previewNamed(name) : c.previewNeutral}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={leadText}>{lead}</Text>

          <Section style={card}>
            <Text style={kicker}>{c.nextStepKicker}</Text>
            <Heading style={h2}>{nextStepLabel}</Heading>
            <Button href={nextStepHref} style={primaryBtn}>{c.nextStepCta}</Button>
          </Section>

          <Hr style={hr} />
          <Heading style={h3}>{c.patternsTitle}</Heading>
          <Text style={body}>
            <strong>{c.pattern1Bold}</strong> {c.pattern1Body}
          </Text>
          <Text style={body}>
            <strong>{c.pattern2Bold}</strong> {c.pattern2Body}
          </Text>

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
  component: ActivationDay7Email,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    const name = data.name ? String(data.name) : ''
    const tracked = Number(data.trackedCount) || 0
    if (tracked === 0) return c.subjectZero(name)
    return c.subjectMany(name, tracked)
  }),
  displayName: 'Activation · day 7',
  previewData: {
    name: 'Aizada',
    trackedCount: 4,
    upcomingDeadlineCount: 2,
    pipelineUrl: 'https://topuni.org/pipeline',
    discoverUrl: 'https://topuni.org/discover',
    manageUrl: 'https://topuni.org/account?action=pause-nudges',
    language: 'en',
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
