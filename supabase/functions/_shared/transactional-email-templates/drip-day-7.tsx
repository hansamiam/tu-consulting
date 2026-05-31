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
    preview: "What's getting in the way of your scholarship strategy?",
    headingNamed: (n: string) => `${n}, a quick question.`,
    headingNeutral: 'A quick question.',
    body: "You created your Top Uni account a week ago but haven't run the wizard yet.",
    bodyTwo: 'What\'s blocking you? Four minutes, three questions, a concrete shortlist on the other side.',
    cta: 'Run the wizard',
    signoff: 'Sam Han',
    signoffTitle: 'Founder, Top Uni',
    footerPause: "Don't want these? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    subject: (n: string) => n ? `${n}, a quick question` : 'A quick question about your application strategy',
    tagline: 'Scholarship Strategy',
  },
  ru: {
    htmlLang: 'ru',
    preview: 'Что мешает начать работу над стратегией стипендий?',
    headingNamed: (n: string) => `${n}, быстрый вопрос.`,
    headingNeutral: 'Быстрый вопрос.',
    body: 'Вы создали аккаунт Top Uni неделю назад, но ещё не запустили мастер.',
    bodyTwo: 'Что мешает? Четыре минуты, три вопроса — на выходе конкретный шорт-лист.',
    cta: 'Запустить мастер',
    signoff: 'Сэм Хан',
    signoffTitle: 'Основатель, Top Uni',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    subject: (n: string) => n ? `${n}, быстрый вопрос` : 'Быстрый вопрос о вашей стратегии',
    tagline: 'Стипендиальная Стратегия',
  },
} as const

const DripDay7Email = ({ name, wizardUrl = 'https://topuni.org/topuni-ai', unsubscribeUrl, language = 'en' }: Props) => {
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
            <Text style={styles.body}>{c.bodyTwo}</Text>
            <Section style={styles.ctaWrap}>
              <Link href={wizardUrl} style={styles.ctaPrimary}>{c.cta}</Link>
            </Section>
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
  component: DripDay7Email,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subject(data.name ? String(data.name) : '')
  }),
  displayName: 'Drip · day 7 re-engagement',
  previewData: {
    name: 'Aizada',
    wizardUrl: 'https://topuni.org/topuni-ai',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
    language: 'en',
  },
} satisfies TemplateEntry
