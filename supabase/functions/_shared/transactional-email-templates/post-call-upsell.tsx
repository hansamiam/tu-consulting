import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'TopUni Consulting'

interface Props {
  name?: string
  packageUrl?: string
  promoCode?: string
}

const PostCallEmail = ({ name, packageUrl, promoCode }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Great talking — your next steps + an exclusive offer</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `${name}, that was a great call!` : 'That was a great call!'}</Heading>
        <Text style={lead}>
          Thanks for trusting us with your university journey. Here's a quick recap of what's next.
        </Text>
        <Heading style={h2}>Your action items</Heading>
        <Text style={text}>
          • Finalize your university shortlist (we discussed your top picks)<br />
          • Start drafting your personal statement — earlier is always better<br />
          • Gather transcripts, recommendation letters, and test scores<br />
          • Track every deadline in one place
        </Text>
        <Hr style={hr} />
        <Heading style={h2}>Want us to handle all of this for you?</Heading>
        <Text style={text}>
          Our <strong>Standard Package</strong> covers full application management — essay coaching,
          deadline tracking, scholarship hunting, visa prep — start to acceptance letter.
        </Text>
        {promoCode && (
          <Section style={promoBox}>
            <Text style={promoText}>
              🎁 Exclusive: use code <strong style={code}>{promoCode}</strong> for $200 off — valid 7 days.
            </Text>
          </Section>
        )}
        {packageUrl && (
          <Section style={btnWrap}>
            <Button href={packageUrl} style={primaryBtn}>See packages</Button>
          </Section>
        )}
        <Text style={footer}>Rooting for you,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PostCallEmail,
  subject: 'Your next steps + a thank-you gift inside 🎁',
  displayName: 'Post-call upsell',
  previewData: { name: 'Aizada', packageUrl: 'https://topuni.org/offerings', promoCode: 'POSTCALL200' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a2540', margin: '0 0 16px' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0a2540', margin: '24px 0 12px' }
const lead = { fontSize: '16px', color: '#0a2540', lineHeight: '1.5', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3c4858', lineHeight: '1.6', margin: '0 0 16px' }
const promoBox = { backgroundColor: '#f0f9ff', border: '1px solid #0a2540', borderRadius: '8px', padding: '16px', margin: '20px 0', textAlign: 'center' as const }
const promoText = { fontSize: '14px', color: '#0a2540', margin: 0 }
const code = { fontFamily: 'monospace', fontSize: '16px', color: '#0a2540' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const primaryBtn = { backgroundColor: '#0a2540', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e6ebf1', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '28px 0 0' }
