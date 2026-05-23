/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

/**
 * Fired by stripe-webhook on customer.subscription.created for an
 * active/trialing pro|founding subscription. Sets expectations + lights
 * up the four surfaces a new member usually doesn't know are there.
 */
interface Props {
  name?: string
  tier: 'pro' | 'founding'
  briefUrl: string
  resourcesUrl: string
  discoverUrl: string
  pipelineUrl: string
  accountUrl: string
  unsubscribeUrl?: string  // injected by send-transactional-email default
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    htmlLang: 'en',
    previewNamed: (n: string) => `${n}, you're in. Here's everything that just unlocked.`,
    previewNeutral: "You're in. Here's everything that just unlocked.",
    headingNamed: (n: string) => `${n}, you're in.`,
    headingNeutral: "You're in.",
    leadFn: (tier: string) =>
      `Welcome to TopUni ${tier === 'founding' ? 'Founding' : 'Pro'}. Below are the four places to go this week. We send you exactly one onboarding email — this one. After that you'll hear from us only when something needs your attention.`,
    cardBriefKicker: 'Read first',
    cardBriefTitle: 'Your strategy brief',
    cardBriefBody: 'If you generated one before paying, it lives on your dashboard now — synced across devices. If not, generate one in 60 seconds.',
    cardBriefCta: 'Open my brief',
    cardResourcesKicker: 'New library',
    cardResourcesTitle: 'Member resources',
    cardResourcesBody: 'Templates, frameworks, and the working files we use with private clients.',
    cardResourcesCta: 'Browse resources',
    cardPipelineKicker: 'Built-in tracker',
    cardPipelineTitle: 'Pipeline',
    cardPipelineBody: 'Save scholarships to track deadlines, status, and notes. Members who win open Pipeline 5+ times in their first week.',
    cardPipelineCta: 'Open Pipeline',
    billing: 'Manage billing, swap card, or pause anytime from your account.',
    billingCta: 'Manage account',
    footerNote: 'If anything is off — reply to this email, it reaches us directly.',
    footerPause: "Don't want these emails? ",
    footerPauseLink: 'Unsubscribe',
    footerPauseSuffix: '.',
    teamSignoff: '— Samuel + the TopUni team',
    subjectFn: (n: string, tier: string) =>
      `${n ? `${n}, ` : ''}welcome to TopUni ${tier === 'founding' ? 'Founding' : 'Pro'}`,
  },
  ru: {
    htmlLang: 'ru',
    previewNamed: (n: string) => `${n}, вы в команде. Вот что только что открылось.`,
    previewNeutral: 'Вы в команде. Вот что только что открылось.',
    headingNamed: (n: string) => `${n}, вы в команде.`,
    headingNeutral: 'Вы в команде.',
    leadFn: (tier: string) =>
      `Добро пожаловать в TopUni ${tier === 'founding' ? 'Founding' : 'Pro'}. Ниже — четыре места, куда стоит зайти на этой неделе. Это единственное приветственное письмо. Дальше вы услышите нас только если что-то требует вашего внимания.`,
    cardBriefKicker: 'Прочитайте первым',
    cardBriefTitle: 'Ваш стратегический отчёт',
    cardBriefBody: 'Если вы сгенерировали его до оплаты — он уже в вашем дашборде, синхронизирован между устройствами. Если нет — это занимает 60 секунд.',
    cardBriefCta: 'Открыть отчёт',
    cardResourcesKicker: 'Новая библиотека',
    cardResourcesTitle: 'Ресурсы для участников',
    cardResourcesBody: 'Шаблоны, фреймворки и рабочие файлы, которые мы используем с частными клиентами.',
    cardResourcesCta: 'Открыть ресурсы',
    cardPipelineKicker: 'Встроенный трекер',
    cardPipelineTitle: 'Pipeline',
    cardPipelineBody: 'Сохраняйте стипендии, чтобы отслеживать дедлайны, статус и заметки. Участники, которые побеждают, открывают Pipeline 5+ раз в первую неделю.',
    cardPipelineCta: 'Открыть Pipeline',
    billing: 'Управление подпиской, замена карты или пауза — из вашего аккаунта.',
    billingCta: 'Управление аккаунтом',
    footerNote: 'Если что-то не так — ответьте на это письмо, оно приходит к нам напрямую.',
    footerPause: 'Не нужны такие письма? ',
    footerPauseLink: 'Отписаться',
    footerPauseSuffix: '.',
    teamSignoff: '— Сэмюэл и команда TopUni',
    subjectFn: (n: string, tier: string) =>
      `${n ? `${n}, ` : ''}добро пожаловать в TopUni ${tier === 'founding' ? 'Founding' : 'Pro'}`,
  },
} as const

const MembershipWelcomeEmail = ({
  name, tier, briefUrl, resourcesUrl, pipelineUrl, accountUrl, unsubscribeUrl, language = 'en',
}: Props) => {
  const c = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html lang={c.htmlLang} dir="ltr">
      <Head />
      <Preview>{name ? c.previewNamed(name) : c.previewNeutral}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? c.headingNamed(name) : c.headingNeutral}</Heading>
          <Text style={lead}>{c.leadFn(tier)}</Text>

          <Section style={card}>
            <Text style={kicker}>{c.cardBriefKicker}</Text>
            <Heading style={h2}>{c.cardBriefTitle}</Heading>
            <Text style={body}>{c.cardBriefBody}</Text>
            <Button href={briefUrl} style={primaryBtn}>{c.cardBriefCta}</Button>
          </Section>

          <Section style={card}>
            <Text style={kicker}>{c.cardResourcesKicker}</Text>
            <Heading style={h2}>{c.cardResourcesTitle}</Heading>
            <Text style={body}>{c.cardResourcesBody}</Text>
            <Button href={resourcesUrl} style={secondaryBtn}>{c.cardResourcesCta}</Button>
          </Section>

          <Section style={card}>
            <Text style={kicker}>{c.cardPipelineKicker}</Text>
            <Heading style={h2}>{c.cardPipelineTitle}</Heading>
            <Text style={body}>{c.cardPipelineBody}</Text>
            <Button href={pipelineUrl} style={secondaryBtn}>{c.cardPipelineCta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={lead}>
            {c.billing} <a href={accountUrl} style={subtleLink}>{c.billingCta}</a>.
          </Text>
          <Text style={footer}>{c.footerNote}</Text>
          {unsubscribeUrl && (
            <Text style={footer}>
              {c.footerPause}<a href={unsubscribeUrl} style={subtleLink}>{c.footerPauseLink}</a>{c.footerPauseSuffix}
            </Text>
          )}
          <Text style={footer}>{c.teamSignoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MembershipWelcomeEmail,
  subject: ((data: Record<string, any>) => {
    const c = COPY[data.language === 'ru' ? 'ru' : 'en']
    return c.subjectFn(
      data.name ? String(data.name) : '',
      data.tier === 'founding' ? 'founding' : 'pro',
    )
  }),
  displayName: 'Billing · membership welcome',
  previewData: {
    name: 'Aizada',
    tier: 'founding',
    briefUrl: 'https://topuni.org/topuni-ai',
    resourcesUrl: 'https://topuni.org/academy',
    discoverUrl: 'https://topuni.org/discover',
    pipelineUrl: 'https://topuni.org/pipeline',
    accountUrl: 'https://topuni.org/account',
    unsubscribeUrl: 'https://topuni.org/unsubscribe?token=preview',
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
const subtleLink = { color: '#0a2540', textDecoration: 'underline', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#8898aa', margin: '6px 0' }
