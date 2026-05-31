/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles } from './brand.ts'

interface Props {
  name?: string
  wizardUrl?: string
  calUrl?: string
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'Still thinking it over? One concrete use case inside.',
    headingNamed: (n: string) => `${n}, still thinking it over?`,
    headingNeutral: 'Still thinking it over?',
    body: 'Most students use Top Uni for one of two things:',
    bullets: [
      'Building a scholarship shortlist they didn\'t know existed.',
      'Pressure-testing a list they already have.',
    ],
    bodyTwo: 'The wizard handles either.',
    calNote: 'Or if you\'d rather talk it through first, book a free 15-minute call. No pitch, just help.',
    ctaWizard: 'Open the wizard',
    ctaCal: 'Book a 15-min call',
    finalNote: 'This is the last email in this sequence.',
    signoff: '— The Top Uni team',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    subject: (n: string) => n ? `${n}, still thinking it over?` : 'Still thinking it over?',
    tagline: 'Scholarship Strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ещё думаете? Один конкретный сценарий внутри.',
    headingNamed: (n: string) => `${n}, ещё думаете?`,
    headingNeutral: 'Ещё думаете?',
    body: 'Большинство студентов используют Top Uni для одного из двух:',
    bullets: [
      'Найти стипендии, о которых не знали.',
      'Проверить список, который уже есть.',
    ],
    bodyTwo: 'Мастер справится с обоими.',
    calNote: 'Или если сначала хотите поговорить — запишитесь на 15-минутный звонок. Без питча, просто помощь.',
    ctaWizard: 'Открыть мастер',
    ctaCal: 'Записаться на звонок',
    finalNote: 'Это последнее письмо в этой серии.',
    signoff: '— Команда Top Uni',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    subject: (n: string) => n ? `${n}, ещё думаете?` : 'Ещё думаете?',
    tagline: 'Стипендиальная Стратегия',
  },
} as const

const bulletText = { fontSize: '15px', color: '#2E3A55', lineHeight: '1.7', margin: '0 0 8px', paddingLeft: '16px' } as const

const DripDay14Email = ({ name, wizardUrl = 'https://topuni.org/topuni-ai', calUrl, unsubscribeUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={styles.page}>
        <Container style={styles.container}>
          <Section style={styles.masthead}>
            <Text style={styles.wordmark}>Top Uni</Text>
            <Text style={styles.tagline}>{c.tagline}</Text>
          </Section>

          <Section style={styles.card}>
            <Heading as="h1" style={styles.h1}>
              {name ? c.headingNamed(name) : c.headingNeutral}
            </Heading>
            <Hr style={styles.goldRule} />
            <Text style={styles.body}>{c.body}</Text>
            {c.bullets.map((b, i) => (
              <Text key={i} style={bulletText}>· {b}</Text>
            ))}
            <Text style={{ ...styles.body, marginTop: '14px' }}>{c.bodyTwo}</Text>
            <Section style={styles.ctaWrap}>
              <Link href={wizardUrl} style={styles.ctaPrimary}>{c.ctaWizard}</Link>
            </Section>
            {calUrl && (
              <>
                <Text style={{ ...styles.bodySmall, marginTop: '24px' }}>{c.calNote}</Text>
                <Section style={styles.ctaWrap}>
                  <Link href={calUrl} style={styles.ctaSecondary}>{c.ctaCal}</Link>
                </Section>
              </>
            )}
            <Hr style={styles.divider} />
            <Text style={styles.bodySmall}>{c.finalNote}</Text>
            <Text style={styles.signoff}>{c.signoff}</Text>
          </Section>

          <Section style={styles.footer}>
            {unsubscribeUrl && (
              <Text style={styles.footerLine}>
                {c.footerPause}<a href={unsubscribeUrl} style={styles.footerLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
              </Text>
            )}
            <Text style={styles.footerLine}>Top Uni · topuni.org</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DripDay14Email,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Drip · day 14 final nudge',
  previewData: {
    name: 'Aizada',
    wizardUrl: 'https://topuni.org/topuni-ai',
    calUrl: 'https://cal.com/topuni/15min',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry
