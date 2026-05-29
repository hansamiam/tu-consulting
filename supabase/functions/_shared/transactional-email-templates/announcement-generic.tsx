/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// announcement-generic — used by broadcast-to-members for admin-fired
// ad-hoc broadcasts (emergency notices, schedule changes, launch
// announcements, product news). Subject + body markdown come from the
// admin UI; we render a minimal branded shell around them.
//
// Approval gate: this template is created as a new entry → admin must
// flip is_approved in /app/admin/email-templates before it can send.

interface Props {
  subject: string
  bodyMarkdown: string
  kind?: 'emergency' | 'workshop' | 'announcement' | 'product'
  language?: 'en' | 'ru'
}

const KIND_LABEL_EN: Record<NonNullable<Props['kind']>, string> = {
  emergency: 'Important update',
  workshop: 'Workshop update',
  announcement: 'Announcement',
  product: 'Product update',
}

const KIND_LABEL_RU: Record<NonNullable<Props['kind']>, string> = {
  emergency: 'Важное обновление',
  workshop: 'Обновление по воркшопу',
  announcement: 'Объявление',
  product: 'Обновление продукта',
}

// Minimal markdown → JSX. We don't pull in a parser — keep the
// transformation cheap and predictable. Supported: blank-line
// paragraphs, leading `# ` headings, leading `- ` bullets. Anything
// else renders as-is inside a paragraph.
function renderMarkdown(md: string): React.ReactNode[] {
  const blocks = md.split(/\n\s*\n/).filter((b) => b.trim().length > 0)
  return blocks.map((block, i) => {
    const trimmed = block.trim()
    if (trimmed.startsWith('# ')) {
      return (
        <Heading key={i} as="h2" style={{ fontSize: 18, margin: '16px 0 8px' }}>
          {trimmed.slice(2)}
        </Heading>
      )
    }
    if (/^- /m.test(trimmed)) {
      const items = trimmed.split('\n').filter((l) => l.startsWith('- '))
      return (
        <ul key={i} style={{ paddingLeft: 18, margin: '8px 0' }}>
          {items.map((li, j) => (
            <li key={j} style={{ marginBottom: 4 }}>{li.slice(2)}</li>
          ))}
        </ul>
      )
    }
    return <Text key={i} style={{ margin: '8px 0' }}>{trimmed}</Text>
  })
}

const AnnouncementGeneric: React.FC<Props> = ({
  subject, bodyMarkdown, kind = 'announcement', language = 'en',
}) => {
  const labelMap = language === 'ru' ? KIND_LABEL_RU : KIND_LABEL_EN
  const kicker = labelMap[kind]
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#f6f5f1', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
        <Container style={{ maxWidth: 560, margin: '24px auto', padding: 24, backgroundColor: '#ffffff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a7a3f', margin: 0 }}>
            TopUni · {kicker}
          </Text>
          <Heading as="h1" style={{ fontSize: 22, lineHeight: '28px', margin: '8px 0 16px', color: '#0a2540' }}>
            {subject}
          </Heading>
          <Hr style={{ borderColor: '#e4e1d6', margin: '0 0 16px' }} />
          <Section>{renderMarkdown(bodyMarkdown)}</Section>
          <Hr style={{ borderColor: '#e4e1d6', margin: '24px 0 12px' }} />
          <Text style={{ fontSize: 12, color: '#666', margin: 0 }}>
            {language === 'ru'
              ? 'Сообщение от команды TopUni. Отписаться можно по ссылке внизу письма.'
              : 'Sent by the TopUni team. Unsubscribe link in the footer.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: AnnouncementGeneric,
  subject: (data) => (data.subject as string) || 'TopUni — update',
  displayName: 'Announcement (generic)',
  previewData: {
    subject: 'A schedule change for Thursday\'s workshop',
    bodyMarkdown: 'Hi members,\n\nThis Thursday\'s workshop on Yale scholarships has been moved from 7pm to 8pm Almaty time. The Zoom link is unchanged.\n\n- New time: 8pm Almaty\n- Same link, same topic\n- Recording posts within 24h\n\nSee you there.',
    kind: 'workshop',
    language: 'en',
  },
}
