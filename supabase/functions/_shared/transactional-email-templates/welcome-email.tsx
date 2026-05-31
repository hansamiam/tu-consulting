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
  unsubscribeUrl?: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    preview: 'Your personalized scholarship strategy starts with the wizard.',
    headingNamed: (n: string) => `Welcome, ${n}.`,
    headingNeutral: 'Welcome to Top Uni.',
    lead: 'Top Uni is the scholarship search engine and AI strategy tool for international students.',
    note: 'The wizard walks you through your background, academics, and goals — then produces a concrete shortlist and the first action step. No generic advice.',
    cta: 'Start the wizard',
    expectations: 'We only email when something requires your attention.',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: '— The Top Uni team',
    subject: (n: string) => n ? `Welcome to Top Uni, ${n}` : 'Welcome to Top Uni',
    tagline: 'Scholarship Strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Ваша персональная стратегия стипендий начинается с мастера.',
    headingNamed: (n: string) => `Добро пожаловать, ${n}.`,
    headingNeutral: 'Добро пожаловать в Top Uni.',
    lead: 'Top Uni — поисковик стипендий и инструмент AI-стратегии для иностранных студентов.',
    note: 'Мастер пройдёт с вами по вашему профилю, академическим показателям и целям — на выходе конкретный шорт-лист и первый шаг. Без общих советов.',
    cta: 'Запустить мастер',
    expectations: 'Мы пишем только когда требуется ваше внимание.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: '— Команда Top Uni',
    subject: (n: string) => n ? `Добро пожаловать в Top Uni, ${n}` : 'Добро пожаловать в Top Uni',
    tagline: 'Стипендиальная Стратегия',
  },
} as const

const WelcomeEmail = ({ name, wizardUrl = 'https://topuni.org/topuni-ai', unsubscribeUrl, language = 'en' }: Props) => {
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
            <Text style={styles.body}>{c.lead}</Text>
            <Text style={styles.noteHighlight}>{c.note}</Text>
            <Section style={styles.ctaWrap}>
              <Link href={wizardUrl} style={styles.ctaPrimary}>{c.cta}</Link>
            </Section>
            <Hr style={styles.divider} />
            <Text style={styles.bodySmall}>{c.expectations}</Text>
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
  component: WelcomeEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Signup · welcome email',
  previewData: {
    name: 'Aizada',
    wizardUrl: 'https://topuni.org/topuni-ai',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry
