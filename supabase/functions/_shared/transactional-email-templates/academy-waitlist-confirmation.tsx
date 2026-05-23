/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// F12 — Academy waitlist confirmation. Plan calls for "we'll email when we
// open without committing a date; transparency over over-promising." So this
// template is deliberately short and date-free — just confirms we have you
// on the list and says what to expect when we launch.

const SITE_NAME = 'Top Uni Academy'

interface Props {
  /** First name if known (full_name on the waitlist row). */
  firstName?: string
  /** Where they signed up from — shown back to the user as a soft anchor. */
  source?: string
  /** 'ru' → Russian variant. */
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    kicker: 'Top Uni Academy · You\'re on the list',
    previewFallback: 'You\'re on the Top Uni Academy waitlist. We\'ll email you when we open.',
    greetingNamed: (n: string) => `${n}, you\'re on the list.`,
    greetingNeutral: 'You\'re on the list.',
    body1: 'We\'ll email when Top Uni Academy opens for enrollment. No date promised yet — we\'re building it the right way, not the fast way.',
    body2: 'What to expect when we open: async cohort cycles, live group strategy calls with operators who\'ve actually run admissions, and a content library that maps to the exact decisions you\'re making this cycle.',
    body3: 'Until then, your strategy brief and Discover feed keep working — we\'ll layer Academy on top, not replace what already helps you.',
    teamSignoff: '— The Top Uni Team',
    htmlLang: 'en',
  },
  ru: {
    kicker: 'Top Uni Academy · Вы в списке',
    previewFallback: 'Вы добавлены в лист ожидания Top Uni Academy. Мы напишем, когда откроем набор.',
    greetingNamed: (n: string) => `${n}, вы в списке.`,
    greetingNeutral: 'Вы в списке.',
    body1: 'Мы напишем, когда Top Uni Academy откроется. Дату пока не называем — собираем правильно, а не быстро.',
    body2: 'Что внутри после запуска: асинхронные когорты, живые групповые звонки со стратегами, которые сами проходили процесс приёма, и библиотека материалов под конкретные решения этого цикла.',
    body3: 'А пока — ваш стратегический брифинг и Discover-лента продолжают работать. Academy добавится сверху, не вместо.',
    teamSignoff: '— Команда Top Uni',
    htmlLang: 'ru',
  },
} as const

const AcademyWaitlistConfirmationEmail = ({
  firstName,
  source: _source,
  language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const greeting = firstName ? c.greetingNamed(firstName) : c.greetingNeutral
  return (
    <Html lang={c.htmlLang}>
      <Head />
      <Preview>{c.previewFallback}</Preview>
      <Body style={{ backgroundColor: '#f6f7f9', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px' }}>
          <Section>
            <Text style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 8px' }}>{c.kicker}</Text>
            <Heading as="h1" style={{ fontSize: '24px', lineHeight: '1.25', color: '#111827', margin: '0 0 20px' }}>{greeting}</Heading>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 14px' }}>{c.body1}</Text>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 14px' }}>{c.body2}</Text>
            <Text style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 14px' }}>{c.body3}</Text>
            <Hr style={{ borderColor: '#e5e7eb', margin: '28px 0 16px' }} />
            <Text style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{c.teamSignoff}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: AcademyWaitlistConfirmationEmail,
  subject: (data) => {
    const lang = (data as Props).language === 'ru' ? 'ru' : 'en'
    return lang === 'ru' ? 'Вы в списке ожидания Top Uni Academy' : 'You\'re on the Top Uni Academy waitlist'
  },
  displayName: 'Academy Waitlist Confirmation',
  previewData: {
    firstName: 'Aigerim',
    source: 'brief_end',
    language: 'en',
  } satisfies Props,
}
