/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// welcome-gift — fired by stripe-webhook a few seconds after
// membership-welcome on a successful customer.subscription.created.
// Frames an over-delivery moment: "here's a small gift on top of the
// membership, it's already yours". Picks the academy_resources row
// flagged is_welcome_gift = true and links to its signed download URL.

interface Props {
  firstName?: string
  giftTitle: string
  giftDescription?: string
  downloadUrl: string
  language?: 'en' | 'ru'
}

const COPY = {
  en: {
    preview: (t: string) => `Small gift to start: ${t}`,
    headingNamed: (n: string) => `${n}, on the house.`,
    headingNeutral: 'On the house.',
    intro:
      "Welcome again. Small thank-you for joining — a working file from our private kit, yours to keep whether you stay a member or not.",
    cta: 'Download the gift',
    footerNote:
      "We'll keep adding to the member library over the next few weeks. Stay tuned.",
    signoff: '— Samuel + the TopUni team',
  },
  ru: {
    preview: (t: string) => `Маленький подарок для старта: ${t}`,
    headingNamed: (n: string) => `${n}, это вам.`,
    headingNeutral: 'Это вам.',
    intro:
      'Ещё раз привет. Небольшой подарок за то, что вы с нами — рабочий файл из нашего внутреннего набора, остаётся у вас независимо от подписки.',
    cta: 'Скачать подарок',
    footerNote:
      'В ближайшие недели мы добавим в библиотеку участников ещё материалов.',
    signoff: '— Сэмюэл и команда TopUni',
  },
} as const

const WelcomeGift: React.FC<Props> = ({
  firstName, giftTitle, giftDescription, downloadUrl, language = 'en',
}) => {
  const t = COPY[language === 'ru' ? 'ru' : 'en']
  return (
    <Html>
      <Head />
      <Preview>{t.preview(giftTitle)}</Preview>
      <Body style={{ backgroundColor: '#f6f5f1', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
        <Container style={{ maxWidth: 560, margin: '24px auto', padding: 24, backgroundColor: '#ffffff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a7a3f', margin: 0 }}>
            TopUni · Member gift
          </Text>
          <Heading as="h1" style={{ fontSize: 22, margin: '8px 0 16px', color: '#0a2540' }}>
            {firstName ? t.headingNamed(firstName) : t.headingNeutral}
          </Heading>
          <Hr style={{ borderColor: '#e4e1d6', margin: '0 0 16px' }} />
          <Section>
            <Text style={{ margin: '0 0 12px' }}>{t.intro}</Text>
            <Text style={{ fontWeight: 600, margin: '0 0 4px' }}>{giftTitle}</Text>
            {giftDescription && (
              <Text style={{ margin: '0 0 16px', color: '#444' }}>{giftDescription}</Text>
            )}
            <Button
              href={downloadUrl}
              style={{
                backgroundColor: '#0a2540',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              {t.cta}
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e4e1d6', margin: '24px 0 12px' }} />
          <Text style={{ fontSize: 13, color: '#666', margin: '0 0 4px' }}>{t.footerNote}</Text>
          <Text style={{ fontSize: 13, color: '#444', margin: 0 }}>{t.signoff}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: WelcomeGift,
  subject: (data) => {
    const lang = data.language === 'ru' ? 'ru' : 'en'
    const title = (data.giftTitle as string) || (lang === 'ru' ? 'подарок' : 'gift')
    return lang === 'ru'
      ? `Маленький подарок от TopUni: ${title}`
      : `A small gift from TopUni: ${title}`
  },
  displayName: 'Welcome gift (PDF)',
  previewData: {
    firstName: 'Aigerim',
    giftTitle: 'Scholarship application — 7-day strategy worksheet',
    giftDescription: 'The exact worksheet our consulting clients fill in before drafting an essay.',
    downloadUrl: 'https://topuni.org/academy/resources',
    language: 'en',
  },
}
