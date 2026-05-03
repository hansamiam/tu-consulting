/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as bookingReminder24h } from './booking-reminder-24h.tsx'
import { template as bookingReminder1h } from './booking-reminder-1h.tsx'
import { template as noShowRecovery } from './no-show-recovery.tsx'
import { template as postCallUpsell } from './post-call-upsell.tsx'
import { template as scholarshipDeadline } from './scholarship-deadline.tsx'
import { template as weeklyNudge } from './weekly-nudge.tsx'
import { template as referralConverted } from './referral-converted.tsx'
import { template as briefGenerated } from './brief-generated.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'booking-reminder-24h': bookingReminder24h,
  'booking-reminder-1h': bookingReminder1h,
  'no-show-recovery': noShowRecovery,
  'post-call-upsell': postCallUpsell,
  'scholarship-deadline': scholarshipDeadline,
  'weekly-nudge': weeklyNudge,
  'referral-converted': referralConverted,
  'brief-generated': briefGenerated,
}
