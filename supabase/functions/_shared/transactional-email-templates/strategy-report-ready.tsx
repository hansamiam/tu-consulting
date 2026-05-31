/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles } from './brand.ts'

interface Props {
  name?: string
  reportUrl: string
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'Your Top Uni strategy is ready.',
    headingNamed: (n: string) => `${n}, your strategy is ready.`,
    headingNeutral: 'Your strategy is ready.',
    body: 'Personalized scholarship strategy, shortlist, and the first action step are inside.',
    cta: 'Open my strategy',
    signoff: 'Top Uni',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    subject: (n: string) => n ? `${n}, your Top Uni strategy is ready` : 'Your Top Uni strategy is ready',
    tagline: 'Scholarship Strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ваша стратегия Top Uni готова.',
    headingNamed: (n: string) => `${n}, ваша стратегия готова.`,
    headingNeutral: 'Ваша стратегия готова.',
    body: 'Внутри персональная стратегия стипендий, шорт-лист и первый шаг.',
    cta: 'Открыть стратегию',
    signoff: 'Top Uni',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    subject: (n: string) => n ? `${n}, ваша стратегия Top Uni готова` : 'Ваша стратегия Top Uni готова',
    tagline: 'Стипендиальная Стратегия',
  },
} as const

const StrategyReportReadyEmail = ({ name, reportUrl, unsubscribeUrl, language = 'en' }: Props) => {
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
            <Section style={styles.ctaWrap}>
              <Link href={reportUrl} style={styles.ctaPrimary}>{c.cta}</Link>
            </Section>
            <Text style={styles.signoff}>— {c.signoff}</Text>
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
  component: StrategyReportReadyEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Strategy report ready',
  previewData: {
    name: 'Aizada',
    reportUrl: 'https://topuni.org/topuni-ai',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry
