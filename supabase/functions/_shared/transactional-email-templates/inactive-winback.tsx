/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  daysAway: number
  newScholarshipsSinceVisit: number
  trackedCount: number
  pipelineUrl: string
  discoverUrl: string
  manageUrl: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    headingNamed: (n: string) => `${n}, we kept the lights on.`,
    headingNeutral: 'Hi, we kept the lights on.',
    leadTracked: (days: number, count: number) =>
      `It's been ${days} days since you checked in. ${count === 1 ? 'You have 1 saved scholarship still in your pipeline' : `You have ${count} saved scholarships still in your pipeline`} — most cycles are decided in the back half, not the start.`,
    leadFresh: (days: number, newCount: number) =>
      `It's been ${days} days. We've added ${newCount > 0 ? `${newCount} new scholarships` : 'new scholarships'} to the database since you last visited.`,
    ctaPipeline: 'Open Pipeline',
    ctaDiscover: 'Open Discover',
    newKicker: "New since you've been away",
    newTitle: (n: number) => `${n} scholarships added`,
    newBody: "Some of them probably match your saved searches and filters. Worth a 60-second scroll to see if anything's worth saving.",
    footerPause: 'Not interested anymore? ',
    footerPauseLink: 'Pause emails from your account',
    footerPauseSuffix: " or just ignore this — we won't bug you.",
    teamSignoff: '— The TopUni Team',
    subjectNew: (n: string, c: number) => `${n}${c} new scholarships since you've been gone`,
    subjectNoNew: (n: string, d: number) => `${n}${d} days — your TopUni pipeline is still here`,
    previewSuffix: (d: number) => `${d}+ days since your last visit`,
  },
  ru: {
    htmlLang: 'ru',
    headingNamed: (n: string) => `${n}, мы держим всё наготове.`,
    headingNeutral: 'Привет — мы держим всё наготове.',
    leadTracked: (days: number, count: number) =>
      `Прошло ${days} дн. с вашего последнего захода. Сохранено в pipeline: ${count}. Большинство циклов решаются во второй половине, а не в начале.`,
    leadFresh: (days: number, newCount: number) =>
      `Прошло ${days} дн. Мы добавили ${newCount > 0 ? `${newCount} новых стипендий` : 'новые стипендии'} в базу с момента вашего последнего визита.`,
    ctaPipeline: 'Открыть Pipeline',
    ctaDiscover: 'Открыть Discover',
    newKicker: 'Новое за время вашего отсутствия',
    newTitle: (n: number) => `Добавлено стипендий: ${n}`,
    newBody: 'Часть из них наверняка совпадает с вашими сохранёнными поисками. 60 секунд на быструю прокрутку — может найдётся что сохранить.',
    footerPause: 'Больше не интересно? ',
    footerPauseLink: 'Поставить письма на паузу',
    footerPauseSuffix: ' или просто игнорируйте — больше беспокоить не будем.',
    teamSignoff: '— Команда TopUni',
    subjectNew: (n: string, c: number) => `${n}${c} новых стипендий с вашего ухода`,
    subjectNoNew: (n: string, d: number) => `${n}${d} дн. — ваш pipeline всё ещё здесь`,
    previewSuffix: (d: number) => `${d}+ дн. с последнего визита`,
  },
} as const

const InactiveWinbackEmail = ({
  name, daysAway, newScholarshipsSinceVisit, trackedCount, pipelineUrl, discoverUrl, manageUrl, language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  const lead = trackedCount > 0
    ? c.leadTracked(daysAway, trackedCount)
    : c.leadFresh(daysAway, newScholarshipsSinceVisit)

  const cta = trackedCount > 0
    ? { label: c.ctaPipeline, href: pipelineUrl }
    : { label: c.ctaDiscover, href: discoverUrl }

  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{name ? `${name}, ` : ''}{c.previewSuffix(daysAway)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={leadText}>{lead}</Text>

          {newScholarshipsSinceVisit > 0 && (
            <Section style={card}>
              <Text style={kicker}>{c.newKicker}</Text>
              <Heading style={h2}>{c.newTitle(newScholarshipsSinceVisit)}</Heading>
              <Text style={body}>{c.newBody}</Text>
            </Section>
          )}

          <Section style={btnWrap}>
            <Button href={cta.href} style={primaryBtn}>{cta.label}</Button>
          </Section>

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
  component: InactiveWinbackEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    const n = data.name ? `${String(data.name)}, ` : ''
    const days = Number(data.daysAway) || 30
    const newScholarships = Number(data.newScholarshipsSinceVisit) || 0
    if (newScholarships > 0) return c.subjectNew(n, newScholarships)
    return c.subjectNoNew(n, days)
  }),
  displayName: 'Inactive · win-back',
  previewData: {
    name: 'Aizada',
    daysAway: 32,
    newScholarshipsSinceVisit: 14,
    trackedCount: 6,
    pipelineUrl: 'https://topuni.org/pipeline',
    discoverUrl: 'https://topuni.org/discover',
    manageUrl: 'https://topuni.org/account?action=pause-nudges',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const leadText = { fontSize: '15px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 20px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px', margin: '0 0 18px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0' }
const btnWrap = { textAlign: 'center' as const, margin: '20px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '24px 0 18px' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
