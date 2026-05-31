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
    preview: 'One thing to do right now — start the 3-step wizard.',
    headingNamed: (n: string) => `Welcome, ${n}.`,
    headingNeutral: 'Welcome to Top Uni.',
    lead: 'Top Uni is the scholarship search engine and AI strategy tool for international students. Your personalized strategy is four minutes away.',
    note: 'The wizard asks three questions. The output is a concrete scholarship shortlist and the first action step — not generic advice.',
    cta: 'Start your strategy',
    expectations: 'We only email when something requires your attention.',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    signoff: 'Sam Han',
    signoffTitle: 'Founder, Top Uni',
    subject: (n: string) => n ? `Welcome to Top Uni, ${n}` : 'Welcome to Top Uni',
    tagline: 'Scholarship Strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Одно действие прямо сейчас — запустить 3-шаговый мастер.',
    headingNamed: (n: string) => `Добро пожаловать, ${n}.`,
    headingNeutral: 'Добро пожаловать в Top Uni.',
    lead: 'Top Uni — поисковик стипендий и инструмент AI-стратегии для иностранных студентов. Ваша персональная стратегия — в четырёх минутах.',
    note: 'Мастер задаёт три вопроса. Результат — конкретный шорт-лист стипендий и первый шаг. Без общих советов.',
    cta: 'Начать стратегию',
    expectations: 'Мы пишем только когда требуется ваше внимание.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    signoff: 'Сэм Хан',
    signoffTitle: 'Основатель, Top Uni',
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
            <Text style={styles.signoff}>{c.signoff}<br />{c.signoffTitle}</Text>
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
