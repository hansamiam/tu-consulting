/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  scholarshipName: string
  deadlineDate: string         // human-readable, e.g. "January 15, 2026"
  daysRemaining: number        // for the urgency line
  status?: string              // e.g. "drafting" — what status the student last set
  amount?: string              // e.g. "Full tuition + $20K stipend"
  scholarshipUrl?: string      // official URL to apply
  trackerUrl: string           // link back to the user's Discover pipeline
  language?: 'en' | 'ru'
}

const STATUS_LABELS = {
  en: {
    researching: 'Researching',
    drafting: 'Drafting',
    submitted: 'Submitted',
    decision: 'Awaiting decision',
    accepted: 'Accepted',
    rejected: 'Rejected',
  },
  ru: {
    researching: 'Изучаю',
    drafting: 'Пишу заявку',
    submitted: 'Подал(а)',
    decision: 'Жду решения',
    accepted: 'Принят(а)',
    rejected: 'Отказ',
  },
} as const

const COPY = {
  en: {
    htmlLang: 'en',
    urgency: (d: number) =>
      d <= 0 ? `Today is the deadline.`
      : d === 1 ? `Tomorrow is the deadline.`
      : d <= 7 ? `${d} days until the deadline.`
      : d <= 30 ? `${d} days remaining.`
      : `Deadline in ${d} days.`,
    headingNamed: (n: string) => `${n}, a deadline you tracked is coming up.`,
    headingNeutral: 'Hi, a deadline you tracked is coming up.',
    kicker: 'Tracking',
    deadlineLabel: 'Deadline',
    statusLabel: 'Your last status',
    openApp: 'Open the application',
    updateStatus: 'Update status in your pipeline →',
    weekTitle: 'What to do this week',
    weekLines: {
      submitted: 'note the decision date in your calendar; mark Awaiting decision.',
      drafting: 'get a fresh pair of eyes on your essays — peer or counselor — at least 72h before deadline. Last-minute revisions miss obvious things.',
      researching: "decide today whether you'll apply. Skipping is a decision; partial applications waste your time more than skipping does.",
    },
    weekLabels: {
      submitted: 'If submitted',
      drafting: 'If drafting',
      researching: 'If researching',
    },
    mutePre: 'Mute reminders for this scholarship — open it in ',
    muteLink: 'your tracker',
    mutePost: ' and change the status to ',
    muteOption1: 'Rejected',
    muteJoin: ' or ',
    muteOption2: 'Decision',
    teamSignoff: `— The ${SITE_NAME} Team`,
    subjectToday: (n: string) => `🚨 Today: ${n}`,
    subjectTomorrow: (n: string) => `🚨 Tomorrow: ${n}`,
    subjectWeek: (d: number, n: string) => `⏰ ${d} days left — ${n}`,
    subjectFar: (d: number, n: string) => `${d} days until ${n}`,
  },
  ru: {
    htmlLang: 'ru',
    urgency: (d: number) =>
      d <= 0 ? `Сегодня дедлайн.`
      : d === 1 ? `Завтра дедлайн.`
      : d <= 7 ? `${d} дн. до дедлайна.`
      : d <= 30 ? `${d} дн. осталось.`
      : `Дедлайн через ${d} дн.`,
    headingNamed: (n: string) => `${n}, ваш дедлайн уже близко.`,
    headingNeutral: 'Привет — ваш дедлайн уже близко.',
    kicker: 'В работе',
    deadlineLabel: 'Дедлайн',
    statusLabel: 'Ваш статус',
    openApp: 'Открыть заявку',
    updateStatus: 'Обновить статус в pipeline →',
    weekTitle: 'Что сделать на этой неделе',
    weekLines: {
      submitted: 'отметьте дату решения в календаре — поставьте статус «Жду решения».',
      drafting: 'покажите эссе свежему читателю — другу или ментору — минимум за 72 часа до дедлайна. Правки в последний момент упускают очевидное.',
      researching: 'решите сегодня — подаёте или нет. Пропустить — тоже решение; полузаполненная заявка отнимает больше времени, чем пропуск.',
    },
    weekLabels: {
      submitted: 'Если подали',
      drafting: 'Если пишете',
      researching: 'Если изучаете',
    },
    mutePre: 'Отключить напоминания — откройте стипендию в ',
    muteLink: 'pipeline',
    mutePost: ' и поставьте статус ',
    muteOption1: 'Отказ',
    muteJoin: ' или ',
    muteOption2: 'Жду решения',
    teamSignoff: `— Команда ${SITE_NAME}`,
    subjectToday: (n: string) => `🚨 Сегодня: ${n}`,
    subjectTomorrow: (n: string) => `🚨 Завтра: ${n}`,
    subjectWeek: (d: number, n: string) => `⏰ ${d} дн. — ${n}`,
    subjectFar: (d: number, n: string) => `${d} дн. до ${n}`,
  },
} as const

const ScholarshipDeadlineEmail = ({
  name,
  scholarshipName,
  deadlineDate,
  daysRemaining,
  status,
  amount,
  scholarshipUrl,
  trackerUrl,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const statusLabels = STATUS_LABELS[language === 'ru' ? 'ru' : 'en']
  const urgencyLine = c.urgency(daysRemaining)
  const urgencyColor =
    daysRemaining <= 7 ? '#b00020' : daysRemaining <= 14 ? '#b8860b' : '#0a2540'
  const localizedStatus =
    status && (statusLabels as Record<string, string>)[status]
      ? (statusLabels as Record<string, string>)[status]
      : status

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{urgencyLine} {scholarshipName} {language === 'ru' ? `закрывается ${deadlineDate}.` : `closes ${deadlineDate}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {name ? c.headingNamed(name) : c.headingNeutral}
          </Heading>
          <Section style={card}>
            <Text style={kicker}>{c.kicker}</Text>
            <Heading style={h2}>{scholarshipName}</Heading>
            {amount && <Text style={amountText}>{amount}</Text>}
            <Hr style={hr} />
            <Text style={{ ...lead, color: urgencyColor }}>{urgencyLine}</Text>
            <Text style={text}>{c.deadlineLabel}: <strong>{deadlineDate}</strong></Text>
            {localizedStatus && <Text style={text}>{c.statusLabel}: <strong>{localizedStatus}</strong></Text>}
          </Section>

          <Section style={btnWrap}>
            {scholarshipUrl && (
              <Button href={scholarshipUrl} style={primaryBtn}>
                {c.openApp}
              </Button>
            )}
            <Text style={subtle}>
              <a href={trackerUrl} style={subtleLink}>{c.updateStatus}</a>
            </Text>
          </Section>

          <Hr style={hr} />
          <Heading style={h3}>{c.weekTitle}</Heading>
          <Text style={text}>
            <strong>{c.weekLabels.submitted}:</strong> {c.weekLines.submitted}<br /><br />
            <strong>{c.weekLabels.drafting}:</strong> {c.weekLines.drafting}<br /><br />
            <strong>{c.weekLabels.researching}:</strong> {c.weekLines.researching}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            {c.mutePre}<a href={trackerUrl} style={subtleLink}>{c.muteLink}</a>{c.mutePost}
            <em>{c.muteOption1}</em>{c.muteJoin}<em>{c.muteOption2}</em>.
          </Text>
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ScholarshipDeadlineEmail,
  subject: ((data: Record<string, any>) => {
    const days = Number(data.daysRemaining) || 0
    const isRu = data.language === 'ru'
    const c = COPY[isRu ? 'ru' : 'en']
    const name = data.scholarshipName || ''
    if (days <= 0) return c.subjectToday(name)
    if (days === 1) return c.subjectTomorrow(name)
    if (days <= 7) return c.subjectWeek(days, name)
    return c.subjectFar(days, name)
  }),
  displayName: 'Scholarship deadline reminder',
  previewData: {
    name: 'Aizada',
    scholarshipName: 'Chevening Scholarships',
    deadlineDate: 'November 5, 2026',
    daysRemaining: 14,
    status: 'drafting',
    amount: 'Full UK tuition + £18,000 stipend',
    scholarshipUrl: 'https://www.chevening.org/scholarships/',
    trackerUrl: 'https://topuni.org/discover',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 24px', lineHeight: '1.3' }
const h2 = { fontSize: '20px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const h3 = { fontSize: '15px', fontWeight: 'bold', color: '#0a2540', margin: '4px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px' }
const lead = { fontSize: '17px', fontWeight: 'bold', lineHeight: '1.4', margin: '12px 0 8px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 6px' }
const amountText = { fontSize: '13px', color: '#5d6b7a', margin: '0 0 12px' }
const subtle = { fontSize: '13px', color: '#8898aa', textAlign: 'center' as const, margin: '12px 0 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
