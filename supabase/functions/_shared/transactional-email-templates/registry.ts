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
import { template as proUpgradeNudge } from './pro-upgrade-nudge.tsx'
import { template as newMatchesDigest } from './new-matches-digest.tsx'
import { template as activationDay1 } from './activation-day-1.tsx'
import { template as activationDay7 } from './activation-day-7.tsx'
import { template as inactiveWinback } from './inactive-winback.tsx'
import { template as paymentFailedRecovery } from './payment-failed-recovery.tsx'
import { template as cancellationRecovery } from './cancellation-recovery.tsx'
import { template as membershipWelcome } from './membership-welcome.tsx'
import { template as academyWaitlistConfirmation } from './academy-waitlist-confirmation.tsx'
import { template as briefLeadNudge } from './brief-lead-nudge.tsx'
import { template as cohortWelcome } from './cohort-welcome.tsx'

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
  'pro-upgrade-nudge': proUpgradeNudge,
  'new-matches-digest': newMatchesDigest,
  'activation-day-1': activationDay1,
  'activation-day-7': activationDay7,
  'inactive-winback': inactiveWinback,
  'payment-failed-recovery': paymentFailedRecovery,
  'cancellation-recovery': cancellationRecovery,
  'membership-welcome': membershipWelcome,
  'academy-waitlist-confirmation': academyWaitlistConfirmation,
  'brief-lead-nudge': briefLeadNudge,
  'cohort-welcome': cohortWelcome,
}
