import { Webhook } from 'https://esm.sh/svix@1.27.0'
import { respondJson } from '../_shared/http.ts'
import { createServiceClient } from '../_shared/clients.ts'

// ─── Resend webhook payloads ───────────────────────────────────────────────
// We handle the three events that should suppress (or warn about) future
// sends to a given recipient:
//   - email.bounced            → permanent bounce, never send again
//   - email.complained         → spam complaint, never send again
//   - email.delivery_delayed   → soft warning, NOT auto-suppressed
//                                (logged for observability only)
//
// Reference: https://resend.com/docs/dashboard/webhooks/event-types
//
// Resend signs the webhook with Svix; verification proves the call came
// from Resend and not an attacker spamming our suppression table.

type ResendEventType =
  | 'email.bounced'
  | 'email.complained'
  | 'email.delivery_delayed'
  | string // accept unknown events without crashing; we filter below

interface ResendBounceData {
  bounce?: {
    type?: string         // e.g. "Permanent", "Transient"
    subType?: string      // e.g. "General", "MailboxFull"
    message?: string
  }
}

interface ResendEmailData {
  email_id?: string
  to?: string | string[]
  from?: string
  subject?: string
  created_at?: string
  // Bounced events embed a `bounce` object on the data payload.
  // Complained events embed `complained_at` etc. We only need `to` +
  // metadata; rest is opaque pass-through into the metadata column.
  [key: string]: unknown
}

interface ResendWebhookEvent {
  type: ResendEventType
  created_at?: string
  data?: ResendEmailData & ResendBounceData
}

function firstRecipient(to: string | string[] | undefined): string | null {
  if (!to) return null
  if (Array.isArray(to)) return to[0] ?? null
  return to
}

function mapEventToReason(eventType: string): 'bounce' | 'complaint' | null {
  switch (eventType) {
    case 'email.bounced':
      return 'bounce'
    case 'email.complained':
      return 'complaint'
    default:
      return null // delivery_delayed and others — no suppression
  }
}

function mapReasonToStatus(
  reason: string,
): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce':
      return 'bounced'
    case 'complaint':
      return 'complained'
    default:
      return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce':
      return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint':
      return 'Spam complaint — recipient marked email as spam'
    default:
      return 'Email suppressed'
  }
}

const jsonResponse = (data: Record<string, unknown>, status = 200) =>
  respondJson(status, data)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  if (!secret) {
    console.error('Missing RESEND_WEBHOOK_SECRET — refusing to verify')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  // Resend webhooks are signed via Svix — verify before trusting payload.
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: 'Missing svix signature headers' }, 400)
  }

  const rawPayload = await req.text()

  let evt: ResendWebhookEvent
  try {
    const wh = new Webhook(secret)
    evt = wh.verify(rawPayload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookEvent
  } catch (error) {
    console.error('Resend webhook signature verification failed', { error })
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }

  // Always log delivery_delayed (visibility) but do NOT suppress.
  if (evt.type === 'email.delivery_delayed') {
    console.log('Resend delivery_delayed', {
      message_id: evt.data?.email_id,
      to_count: Array.isArray(evt.data?.to) ? evt.data?.to.length : 1,
    })
    return jsonResponse({ success: true, suppressed: false, reason: 'delivery_delayed' })
  }

  const reason = mapEventToReason(evt.type)
  if (!reason) {
    // Unknown / ignored event — ack 200 so Resend doesn't retry.
    console.log('Resend event ignored', { type: evt.type })
    return jsonResponse({ success: true, suppressed: false, reason: 'ignored_event' })
  }

  const recipient = firstRecipient(evt.data?.to)
  if (!recipient) {
    console.warn('Resend event missing recipient', { type: evt.type })
    return jsonResponse({ error: 'Missing recipient in payload' }, 400)
  }

  const normalizedEmail = recipient.toLowerCase()
  const messageId = evt.data?.email_id ?? null

  // Pass-through metadata: keep the Resend payload so future audits can
  // see the original bounce.type / bounce.subType context.
  const metadata: Record<string, unknown> = {
    resend_event_type: evt.type,
    resend_email_id: evt.data?.email_id ?? null,
    resend_created_at: evt.created_at ?? evt.data?.created_at ?? null,
    bounce: evt.data?.bounce ?? null,
  }

  const supabase = createServiceClient()

  // 1. Upsert to suppressed_emails (idempotent — safe for retries)
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      {
        email: normalizedEmail,
        reason,
        metadata,
      },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      error: suppressError,
      email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
    })
    return jsonResponse({ error: 'Failed to write suppression' }, 500)
  }

  // 2. Append a new log entry for the suppression event (never update existing rows)
  const sendLogStatus = mapReasonToStatus(reason)
  const sendLogMessage = mapReasonToMessage(reason)

  const { error: insertError } = await supabase
    .from('email_send_log')
    .insert({
      message_id: messageId,
      template_name: 'system',
      recipient_email: normalizedEmail,
      status: sendLogStatus,
      error_message: sendLogMessage,
      metadata,
    })

  if (insertError) {
    // Non-fatal — log and continue. The suppression was already recorded.
    console.warn('Failed to insert email_send_log', {
      error: insertError,
    })
  }

  console.log('Suppression processed', {
    email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
    reason,
    resend_event_type: evt.type,
    has_message_id: !!messageId,
  })

  return jsonResponse({ success: true })
})
