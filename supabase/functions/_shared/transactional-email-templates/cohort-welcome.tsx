/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Phase B2 v2 — fires from stripe-webhook customer.subscription.created
// AFTER the existing membership-welcome email. Looks up the "current
// cohort" for the user (the open/in_progress cohort whose window the
// subscription window overlaps) and welcomes them into it.
//
// Idempotency-keyed by (subscription_id, cohort_id) so Stripe webhook
// redeliveries don't double-send, and so a user who keeps their
// subscription across multiple cohort cycles gets a fresh welcome each
// time a new cohort starts.

interface Props {
  /** Cohort name as shown on /cohorts/:slug */
  cohortName: string
  /** ISO date string when the cohort starts */
  startsAt: string
  /** Cohort slug for portal link */
  cohortSlug: string
  /** Public site URL */
  siteUrl?: string
  /** First name if known (from auth user metadata or Stripe customer name) */
  firstName?: string
  /** 'ru' → Russian variant */
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    kicker: 'Top Uni Cohort · You\'re in',
    previewFallback: 'Your membership unlocked the current cohort. Calendar + portal inside.',
    greetingNamed: (n: string) => `${n}, you\'re in.`,
    greetingNeutral: 'You\'re in.',
    body1: (name: string, date: string) =>
      `Welcome to ${name}. Your Top Uni membership unlocks this cohort cycle, starting ${date}. The full schedule (group calls, workshops, office hours) lives in your portal — bookmark it.`,
    body2: 'No pre-work to do right now. We send the materials two weeks before each session so you read it when it\'s relevant, not when it goes stale.',
    body3: 'Membership = access. You\'re in every cohort cycle that runs while your subscription is active. Skip what doesn\'t apply; attend what does.',
    portalCta: 'Open your cohort portal →',
    teamSignoff: '— The Top Uni Team',
    htmlLang: 'en',
  },
  ru: {
    kicker: 'Top Uni Cohort · Вы внутри',
    previewFallback: 'Подписка открыла доступ к текущей когорте. Календарь и портал внутри.',
    greetingNamed: (n: string) => `${n}, вы внутри.`,
    greetingNeutral: 'Вы внутри.',
    body1: (name: string, date: string) =>
      `Добро пожаловать в ${name}. Подписка Top Uni открывает эту когорту, которая стартует ${date}. Полное расписание — групповые звонки, воркшопы, office hours — в вашем портале. Сохраните в закладки.`,
    body2: 'Pre-work сейчас не нужен. Материалы присылаем за две недели до сессии — чтобы вы прочли их свежими, а не устаревшими.',
    body3: 'Подписка = доступ. Пока подписка активна, вы участник всех когорт. Пропускайте то, что не подходит; ходите на то, что нужно.',
    portalCta: 'Открыть портал когорты →',
    teamSignoff: '— Команда Top Uni',
    htmlLang: 'ru',
  },
} as const

function formatStartDate(iso: string, lang: 'en' | 'ru'): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

const CohortWelcomeEmail = ({
  cohortName, startsAt, cohortSlug, siteUrl, firstName, language = 'en',
}: Props) => {
  const lang = language === 'ru' ? 'ru' : 'en'
  const c = COPY[lang]
  const greeting = firstName ? c.greetingNamed(firstName) : c.greetingNeutral
  const dateStr = formatStartDate(startsAt, lang)
  const base = siteUrl ?? 'https://topuni.org'
  const langSuffix = lang === 'ru' ? '/ru' : ''
  // Per feedback_academy_is_members_area.md — /academy is the single
  // members area; cohort surface integrates AS A SECTION there.
  // cohortSlug is kept on the Props interface for analytics / future
  // per-cohort routing but isn't part of the URL today.
  void cohortSlug
  const portalUrl = `${base}/academy${langSuffix}`
  return (
    <Html lang={c.htmlLang}>
      <Head />
      <Preview>{c.previewFallback}</Preview>
      <Body style={{ backgroundColor: '#f6f7f9', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px' }}>
          <Section>
            <Text style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 8px' }}>{c.kicker}</Text>
            <Heading as="h1" style={{ fontSize: '24px', lineHeight: '1.25', color: '#111827', margin: '0 0 20px' }}>{greeting}</Heading>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 14px' }}>{c.body1(cohortName, dateStr)}</Text>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 14px' }}>{c.body2}</Text>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 14px' }}>{c.body3}</Text>
            <Section style={{ margin: '24px 0' }}>
              <Link href={portalUrl} style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#111827', color: '#ffffff', textDecoration: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
                {c.portalCta}
              </Link>
            </Section>
            <Hr style={{ borderColor: '#e5e7eb', margin: '28px 0 16px' }} />
            <Text style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{c.teamSignoff}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: CohortWelcomeEmail,
  subject: (data) => {
    const props = data as Props
    const lang = props.language === 'ru' ? 'ru' : 'en'
    return lang === 'ru'
      ? `Добро пожаловать в ${props.cohortName}`
      : `Welcome to ${props.cohortName}`
  },
  displayName: 'Cohort Welcome',
  previewData: {
    cohortName: 'September 2026 MBA Cohort',
    startsAt: '2026-09-08T13:00:00.000Z',
    cohortSlug: 'september-2026-mba',
    firstName: 'Aigerim',
    language: 'en',
  } satisfies Props,
}
