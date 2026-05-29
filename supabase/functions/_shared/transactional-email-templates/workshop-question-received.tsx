/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// workshop-question-received — confirmation to the member who just
// submitted a question via /academy or /account, plus a notify-the-team
// copy that uses the same template (the workshop-question-submit edge
// function sends both, swapping recipient + body labels via the
// `forFounder` flag).

interface Props {
  memberEmail: string
  question: string
  workshopTitle?: string
  forFounder?: boolean
  language?: 'en' | 'ru'
}

const QuestionReceived: React.FC<Props> = (p) => (
  <Html>
    <Head />
    <Preview>
      {p.forFounder
        ? `Question from ${p.memberEmail}`
        : 'Got it — your question is in the queue'}
    </Preview>
    <Body style={{ backgroundColor: '#f6f5f1', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
      <Container style={{ maxWidth: 560, margin: '24px auto', padding: 24, backgroundColor: '#ffffff', borderRadius: 8 }}>
        <Text style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a7a3f', margin: 0 }}>
          TopUni · Workshop questions
        </Text>
        <Heading as="h1" style={{ fontSize: 22, margin: '8px 0 16px', color: '#0a2540' }}>
          {p.forFounder ? `Question from ${p.memberEmail}` : 'Got it — your question is in the queue'}
        </Heading>
        <Hr style={{ borderColor: '#e4e1d6', margin: '0 0 16px' }} />
        <Section>
          {p.workshopTitle && (
            <Text style={{ margin: '0 0 8px' }}><strong>Workshop:</strong> {p.workshopTitle}</Text>
          )}
          <Text style={{ fontStyle: 'italic', margin: '8px 0' }}>{p.question}</Text>
          {!p.forFounder && (
            <Text style={{ margin: '12px 0 0' }}>
              We'll cover the highest-voted questions in the next workshop. If yours needs a faster
              answer, reply to this email — we read every one.
            </Text>
          )}
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: QuestionReceived,
  subject: (data) =>
    (data.forFounder as boolean)
      ? `[TopUni Q] ${(data.memberEmail as string) || 'member'}: ${((data.question as string) || '').slice(0, 60)}`
      : 'Your TopUni workshop question is in',
  displayName: 'Workshop question received',
  previewData: {
    memberEmail: 'student@example.com',
    question: 'How do I frame a thin EC list when my school doesn\'t offer clubs?',
    workshopTitle: 'Essay clinics — Thursday',
    forFounder: false,
    language: 'en',
  },
}
