/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Phase B3 v2 — fired by cohort-reminder-cron 24h + 1h before each
// cohort_event.starts_at. One email per active-member, per event, per
// reminder window. Idempotency-keyed by (event_id, window, user_id).

type ReminderWindow = '24h' | '1h'

interface Props {
  /** Event title (workshop name, group call topic, etc.) */
  eventTitle: string
  /** Event kind — drives the kicker copy */
  eventKind: 'group_call' | 'workshop' | 'office_hours' | 'external'
  /** ISO date string when the event starts */
  startsAt: string
  /** Meeting URL (Zoom/Cal.com) */
  meetingUrl?: string
  /** Cohort slug for portal link */
  cohortSlug: string
  /** Public site URL */
  siteUrl?: string
  /** First name if known */
  firstName?: string
  /** Which reminder window — drives the urgency copy */
  window: ReminderWindow
  /** 'ru' → Russian variant */
  language?: 'en' | 'ru'
}

const KIND_LABEL_EN: Record<Props['eventKind'], string> = {
  group_call: 'Group call',
  workshop: 'Workshop',
  office_hours: 'Office hours',
  external: 'Guest speaker',
}
const KIND_LABEL_RU: Record<Props['eventKind'], string> = {
  group_call: 'Групповой звонок',
  workshop: 'Воркшоп',
  office_hours: 'Office hours',
  external: 'Гостевой спикер',
}

const COPY = {
  en: {
    kicker: 'Top Uni Cohort · Reminder',
    previewFallback: (title: string, when: string) => `${title} ${when}. Link inside.`,
    greetingNamed: (n: string) => `${n},`,
    greetingNeutral: 'Heads up —',
    body24h: (title: string, kind: string, date: string) =>
      `${kind}: ${title}. Tomorrow at ${date}. If you're not coming, no need to reply — it's not graded; the recording lands in the portal after.`,
    body1h: (title: string, kind: string, date: string) =>
      `${kind}: ${title}. In about an hour, ${date}. Click below — meeting opens 5 min early.`,
    join: 'Join the meeting →',
    portalCta: 'Open the cohort portal',
    teamSignoff: '— The Top Uni Team',
    htmlLang: 'en',
  },
  ru: {
    kicker: 'Top Uni Cohort · Напоминание',
    previewFallback: (title: string, when: string) => `${title} ${when}. Ссылка внутри.`,
    greetingNamed: (n: string) => `${n},`,
    greetingNeutral: 'Напоминаем —',
    body24h: (title: string, kind: string, date: string) =>
      `${kind}: ${title}. Завтра в ${date}. Не идёте — отвечать не нужно; запись окажется в портале после.`,
    body1h: (title: string, kind: string, date: string) =>
      `${kind}: ${title}. Через час, в ${date}. Нажмите ниже — комната открывается за 5 минут.`,
    join: 'Присоединиться →',
    portalCta: 'Открыть портал когорты',
    teamSignoff: '— Команда Top Uni',
    htmlLang: 'ru',
  },
} as const

function formatTime(iso: string, lang: 'en' | 'ru', window: ReminderWindow): string {
  try {
    return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      // 24h reminder is "tomorrow at 2:00 PM"; 1h reminder is "2:00 PM"
      // — both just need the time, the body copy carries the day framing.
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      ...(window === '24h' ? { weekday: 'long' as const } : {}),
    })
  } catch {
    return iso
  }
}

const CohortEventReminderEmail = ({
  eventTitle, eventKind, startsAt, meetingUrl, cohortSlug, siteUrl,
  firstName, window, language = 'en',
}: Props) => {
  const lang = language === 'ru' ? 'ru' : 'en'
  const c = COPY[lang]
  const kindLabel = (lang === 'ru' ? KIND_LABEL_RU : KIND_LABEL_EN)[eventKind]
  const greeting = firstName ? c.greetingNamed(firstName) : c.greetingNeutral
  const dateStr = formatTime(startsAt, lang, window)
  const body = window === '24h'
    ? c.body24h(eventTitle, kindLabel, dateStr)
    : c.body1h(eventTitle, kindLabel, dateStr)
  const base = siteUrl ?? 'https://topuni.org'
  const langSuffix = lang === 'ru' ? '/ru' : ''
  // Per feedback_academy_is_members_area.md — /academy is the single
  // members area; cohort surface integrates AS A SECTION there.
  void cohortSlug
  const portalUrl = `${base}/academy${langSuffix}`
  return (
    <Html lang={c.htmlLang}>
      <Head />
      <Preview>{c.previewFallback(eventTitle, dateStr)}</Preview>
      <Body style={{ backgroundColor: '#f6f7f9', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px' }}>
          <Section>
            <Text style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 8px' }}>{c.kicker}</Text>
            <Heading as="h1" style={{ fontSize: '22px', lineHeight: '1.3', color: '#111827', margin: '0 0 16px' }}>
              {greeting}
            </Heading>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 18px' }}>{body}</Text>
            {meetingUrl && (
              <Section style={{ margin: '18px 0' }}>
                <Link href={meetingUrl} style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#111827', color: '#ffffff', textDecoration: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
                  {c.join}
                </Link>
              </Section>
            )}
            <Text style={{ fontSize: '14px', color: '#6b7280', margin: '12px 0' }}>
              <Link href={portalUrl} style={{ color: '#6b7280' }}>{c.portalCta} →</Link>
            </Text>
            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 12px' }} />
            <Text style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{c.teamSignoff}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: CohortEventReminderEmail,
  subject: (data) => {
    const props = data as Props
    const lang = props.language === 'ru' ? 'ru' : 'en'
    const when = props.window === '24h' ? '24h' : '1h'
    return lang === 'ru'
      ? `Через ${when === '24h' ? 'день' : 'час'}: ${props.eventTitle}`
      : `In ${when === '24h' ? '24 hours' : '1 hour'}: ${props.eventTitle}`
  },
  displayName: 'Cohort Event Reminder',
  previewData: {
    eventTitle: 'Round 1 essay strategy + live edits',
    eventKind: 'workshop',
    startsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    meetingUrl: 'https://us06web.zoom.us/j/123',
    cohortSlug: 'september-2026-mba',
    firstName: 'Aigerim',
    window: '24h',
    language: 'en',
  } satisfies Props,
}
