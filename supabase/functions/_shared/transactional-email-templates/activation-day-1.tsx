/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  discoverUrl: string
  pipelineUrl: string
  briefReady: boolean
  manageUrl: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    previewNamed: (n: string) => `${n}, your TopUni starter steps for today`,
    previewNeutral: 'Your TopUni starter steps for today',
    headingNamed: (n: string) => `${n}, day one.`,
    headingNeutral: 'Welcome, day one.',
    leadBriefReady: 'Your strategy brief is ready. Now we turn it into a working pipeline. Two small actions today get you from passive to active in this cycle:',
    leadNoBrief: "You signed up — that's the easy part. Two small actions today put you ahead of most applicants:",
    step1Kicker: 'Step 1 · 3 min',
    step1Title: 'Save 3 scholarships you actually like',
    step1Body: "Open Discover, hit Save on three scholarships that fit. Filter by funding type, country, or your demographic if it helps. Don't overthink — these aren't commitments, they're a starting set.",
    step1Cta: 'Open Discover',
    step2Kicker: 'Step 2 · 1 min',
    step2Title: 'Open your Pipeline',
    step2Body: 'Anything you saved lives there with deadlines, status, notes. Hitting it once today wires the habit — most TopUni members who win opened Pipeline 5+ times in their first week.',
    step2Cta: 'Open Pipeline',
    footerNext: "You'll hear from us at week's end with what to do next. Earlier if a saved deadline gets close.",
    footerPause: "Don't want activation emails? ",
    footerPauseLink: 'Pause from your account',
    footerPauseSuffix: '.',
    teamSignoff: '— The TopUni Team',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}two steps for day one`,
  },
  ru: {
    htmlLang: 'ru',
    previewNamed: (n: string) => `${n}, ваши первые шаги в TopUni`,
    previewNeutral: 'Ваши первые шаги в TopUni',
    headingNamed: (n: string) => `${n}, первый день.`,
    headingNeutral: 'Добро пожаловать — первый день.',
    leadBriefReady: 'Ваш стратегический брифинг готов. Теперь превращаем его в рабочий pipeline. Два простых действия сегодня — и вы перешли из «думаю» в «делаю» в этом цикле:',
    leadNoBrief: 'Вы зарегистрировались — это самое лёгкое. Два простых действия сегодня — и вы впереди большинства кандидатов:',
    step1Kicker: 'Шаг 1 · 3 мин',
    step1Title: 'Сохраните 3 стипендии, которые вам подходят',
    step1Body: 'Откройте Discover и нажмите «Сохранить» на трёх стипендиях. Фильтруйте по типу финансирования, стране или своей категории. Не переусложняйте — это не обязательства, это стартовый набор.',
    step1Cta: 'Открыть Discover',
    step2Kicker: 'Шаг 2 · 1 мин',
    step2Title: 'Откройте свой Pipeline',
    step2Body: 'Все сохранённые стипендии лежат там — с дедлайнами, статусом, заметками. Один заход сегодня закрепляет привычку: успешные участники TopUni открывают Pipeline 5+ раз в первую неделю.',
    step2Cta: 'Открыть Pipeline',
    footerNext: 'Мы напишем в конце недели — что делать дальше. Раньше, если приближается дедлайн.',
    footerPause: 'Не нужны активационные письма? ',
    footerPauseLink: 'Поставить на паузу',
    footerPauseSuffix: '.',
    teamSignoff: '— Команда TopUni',
    subjectFn: (n: string) => `${n ? `${n}, ` : ''}два шага в первый день`,
  },
} as const

const ActivationDay1Email = ({ name, discoverUrl, pipelineUrl, briefReady, manageUrl, language = 'en' }: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{name ? c.previewNamed(name) : c.previewNeutral}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{briefReady ? c.leadBriefReady : c.leadNoBrief}</Text>

          <Section style={card}>
            <Text style={kicker}>{c.step1Kicker}</Text>
            <Heading style={h2}>{c.step1Title}</Heading>
            <Text style={body}>{c.step1Body}</Text>
            <Button href={discoverUrl} style={primaryBtn}>{c.step1Cta}</Button>
          </Section>

          <Section style={card}>
            <Text style={kicker}>{c.step2Kicker}</Text>
            <Heading style={h2}>{c.step2Title}</Heading>
            <Text style={body}>{c.step2Body}</Text>
            <Button href={pipelineUrl} style={secondaryBtn}>{c.step2Cta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{c.footerNext}</Text>
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
  component: ActivationDay1Email,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subjectFn(data.name ? String(data.name) : '')
  }),
  displayName: 'Activation · day 1',
  previewData: {
    name: 'Aizada',
    discoverUrl: 'https://topuni.org/discover',
    pipelineUrl: 'https://topuni.org/pipeline',
    briefReady: true,
    manageUrl: 'https://topuni.org/account?action=pause-nudges',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 14px', lineHeight: '1.3' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 8px', lineHeight: '1.25' }
const lead = { fontSize: '15px', color: '#3c4858', lineHeight: '1.55', margin: '0 0 22px' }
const card = { backgroundColor: '#f6f8fb', border: '1px solid #e6ebf1', borderRadius: '12px', padding: '18px 18px 20px', margin: '0 0 14px' }
const kicker = { fontSize: '11px', fontWeight: 'bold', color: '#8898aa', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const body = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 12px' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }
const secondaryBtn = { backgroundColor: '#ffffff', color: '#0a2540', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #d0d7e0', display: 'inline-block' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const subtleLink = { color: '#0a2540', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
