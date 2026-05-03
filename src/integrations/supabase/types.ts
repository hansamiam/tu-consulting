// AUTO-GENERATED — do not edit by hand.
// Regenerate with: npm run gen:types
//
// This file mirrors the public schema of the live Supabase project.
// After any migration that changes the schema, re-run the generator
// so the TypeScript types stay in sync.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admission_requirements: {
        Row: {
          application_deadline: string | null
          created_at: string | null
          gpa_min: number | null
          ielts_required: boolean | null
          ielts_score_min: number | null
          program_id: string
          requirement_id: string
          sat_required: boolean | null
          sat_score_min: number | null
          verified: boolean
        }
        Insert: {
          application_deadline?: string | null
          created_at?: string | null
          gpa_min?: number | null
          ielts_required?: boolean | null
          ielts_score_min?: number | null
          program_id: string
          requirement_id?: string
          sat_required?: boolean | null
          sat_score_min?: number | null
          verified?: boolean
        }
        Update: {
          application_deadline?: string | null
          created_at?: string | null
          gpa_min?: number | null
          ielts_required?: boolean | null
          ielts_score_min?: number | null
          program_id?: string
          requirement_id?: string
          sat_required?: boolean | null
          sat_score_min?: number | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admission_requirements_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["program_id"]
          },
        ]
      }
      aggregated_insights: {
        Row: {
          computed_at: string
          dimension: string | null
          id: string
          metric_name: string
          metric_value: number | null
          period: string | null
        }
        Insert: {
          computed_at?: string
          dimension?: string | null
          id?: string
          metric_name: string
          metric_value?: number | null
          period?: string | null
        }
        Update: {
          computed_at?: string
          dimension?: string | null
          id?: string
          metric_name?: string
          metric_value?: number | null
          period?: string | null
        }
        Relationships: []
      }
      application_tracker: {
        Row: {
          created_at: string
          hidden: boolean
          notes: string | null
          reminder_sent_at: string | null
          scholarship_id: string
          shortlisted: boolean
          status: string | null
          status_changed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          notes?: string | null
          reminder_sent_at?: string | null
          scholarship_id: string
          shortlisted?: boolean
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          notes?: string | null
          reminder_sent_at?: string | null
          scholarship_id?: string
          shortlisted?: boolean
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_tracker_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "application_tracker_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "application_tracker_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      applications: {
        Row: {
          acceptance_rate: number | null
          application_id: string
          created_at: string | null
          portal_url: string | null
          program_id: string
          visa_difficulty_score: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          application_id?: string
          created_at?: string | null
          portal_url?: string | null
          program_id: string
          visa_difficulty_score?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          application_id?: string
          created_at?: string | null
          portal_url?: string | null
          program_id?: string
          visa_difficulty_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["program_id"]
          },
        ]
      }
      bookings: {
        Row: {
          calendly_canceled_at: string | null
          calendly_event_uri: string | null
          calendly_invitee_uri: string | null
          calendly_meeting_url: string | null
          calendly_scheduled_at: string | null
          calendly_status: string | null
          consultation_type: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          discount: number | null
          final_price: number | null
          id: string
          intake_biggest_blocker: string | null
          intake_budget_usd: string | null
          intake_completed_at: string | null
          intake_goals: string | null
          intake_grade_year: string | null
          intake_target_countries: string | null
          is_consultation: boolean
          language: string
          no_show_at: string | null
          notes: string | null
          original_price: string | null
          paid_at: string | null
          promo_code: string | null
          rebook_email_sent_at: string | null
          receipt_path: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
        }
        Insert: {
          calendly_canceled_at?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          calendly_meeting_url?: string | null
          calendly_scheduled_at?: string | null
          calendly_status?: string | null
          consultation_type: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          discount?: number | null
          final_price?: number | null
          id?: string
          intake_biggest_blocker?: string | null
          intake_budget_usd?: string | null
          intake_completed_at?: string | null
          intake_goals?: string | null
          intake_grade_year?: string | null
          intake_target_countries?: string | null
          is_consultation?: boolean
          language?: string
          no_show_at?: string | null
          notes?: string | null
          original_price?: string | null
          paid_at?: string | null
          promo_code?: string | null
          rebook_email_sent_at?: string | null
          receipt_path?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          calendly_canceled_at?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          calendly_meeting_url?: string | null
          calendly_scheduled_at?: string | null
          calendly_status?: string | null
          consultation_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          discount?: number | null
          final_price?: number | null
          id?: string
          intake_biggest_blocker?: string | null
          intake_budget_usd?: string | null
          intake_completed_at?: string | null
          intake_goals?: string | null
          intake_grade_year?: string | null
          intake_target_countries?: string | null
          is_consultation?: boolean
          language?: string
          no_show_at?: string | null
          notes?: string | null
          original_price?: string | null
          paid_at?: string | null
          promo_code?: string | null
          rebook_email_sent_at?: string | null
          receipt_path?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      counselor_messages: {
        Row: {
          content: string
          created_at: string
          message_id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          message_id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          message_id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counselor_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "counselor_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      counselor_sessions: {
        Row: {
          archived: boolean
          created_at: string
          language: string
          last_message_at: string
          message_count: number
          session_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          language?: string
          last_message_at?: string
          message_count?: number
          session_id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          language?: string
          last_message_at?: string
          message_count?: number
          session_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engagement_milestones: {
        Row: {
          achieved_at: string
          id: string
          metadata: Json | null
          milestone_key: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          id?: string
          metadata?: Json | null
          milestone_key: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          id?: string
          metadata?: Json | null
          milestone_key?: string
          user_id?: string
        }
        Relationships: []
      }
      founding_member_counter: {
        Row: {
          cap: number
          claimed_count: number
          id: number
          updated_at: string
        }
        Insert: {
          cap?: number
          claimed_count?: number
          id?: number
          updated_at?: string
        }
        Update: {
          cap?: number
          claimed_count?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      nudge_log: {
        Row: {
          ai_body_preview: string | null
          duration_ms: number | null
          email_error: string | null
          email_status: string | null
          email_subject: string | null
          nudge_id: string
          sent_at: string
          status_pending: number | null
          tracked_count: number | null
          urgent_deadlines: number | null
          user_id: string
        }
        Insert: {
          ai_body_preview?: string | null
          duration_ms?: number | null
          email_error?: string | null
          email_status?: string | null
          email_subject?: string | null
          nudge_id?: string
          sent_at?: string
          status_pending?: number | null
          tracked_count?: number | null
          urgent_deadlines?: number | null
          user_id: string
        }
        Update: {
          ai_body_preview?: string | null
          duration_ms?: number | null
          email_error?: string | null
          email_status?: string | null
          email_subject?: string | null
          nudge_id?: string
          sent_at?: string
          status_pending?: number | null
          tracked_count?: number | null
          urgent_deadlines?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pathway_reports: {
        Row: {
          content: string
          generated_at: string
          language: string
          profile_hash: string
          report_grade: string
          retrieval_method: string | null
          token_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          generated_at?: string
          language?: string
          profile_hash: string
          report_grade?: string
          retrieval_method?: string | null
          token_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          generated_at?: string
          language?: string
          profile_hash?: string
          report_grade?: string
          retrieval_method?: string | null
          token_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_hint: string | null
          created_at: string
          earned_trial_expires_at: string | null
          earned_trial_started_at: string | null
          email: string
          full_name: string | null
          id: string
          language: string
          onboarding_completed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country_hint?: string | null
          created_at?: string
          earned_trial_expires_at?: string | null
          earned_trial_started_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          language?: string
          onboarding_completed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country_hint?: string | null
          created_at?: string
          earned_trial_expires_at?: string | null
          earned_trial_started_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          language?: string
          onboarding_completed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string | null
          degree_level: string
          duration_years: number | null
          field_of_study: string
          program_id: string
          program_name: string
          university_id: string
        }
        Insert: {
          created_at?: string | null
          degree_level: string
          duration_years?: number | null
          field_of_study: string
          program_id?: string
          program_name: string
          university_id: string
        }
        Update: {
          created_at?: string | null
          degree_level?: string
          duration_years?: number | null
          field_of_study?: string
          program_id?: string
          program_name?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["university_id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          premium_conversions: number
          total_uses: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          premium_conversions?: number
          total_uses?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          premium_conversions?: number
          total_uses?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          became_premium_at: string | null
          code: string
          credit_paid_out_at: string | null
          redeem_ip: string | null
          redeem_user_agent: string | null
          referee_user_id: string
          referral_id: string
          referrer_user_id: string
          signed_up_at: string
        }
        Insert: {
          became_premium_at?: string | null
          code: string
          credit_paid_out_at?: string | null
          redeem_ip?: string | null
          redeem_user_agent?: string | null
          referee_user_id: string
          referral_id?: string
          referrer_user_id: string
          signed_up_at?: string
        }
        Update: {
          became_premium_at?: string | null
          code?: string
          credit_paid_out_at?: string | null
          redeem_ip?: string | null
          redeem_user_agent?: string | null
          referee_user_id?: string
          referral_id?: string
          referrer_user_id?: string
          signed_up_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      scholarship_events: {
        Row: {
          anonymous_id: string | null
          context: Json | null
          created_at: string
          event_id: string
          event_type: string
          scholarship_id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          context?: Json | null
          created_at?: string
          event_id?: string
          event_type: string
          scholarship_id: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          context?: Json | null
          created_at?: string
          event_id?: string
          event_type?: string
          scholarship_id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_events_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_events_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_events_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      scholarship_sources: {
        Row: {
          category: string | null
          consecutive_failures: number
          created_at: string
          frequency_hours: number
          is_active: boolean
          last_content_hash: string | null
          last_crawled_at: string | null
          last_success_at: string | null
          name: string
          parser_hint: string | null
          region: string | null
          source_id: string
          source_type: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          consecutive_failures?: number
          created_at?: string
          frequency_hours?: number
          is_active?: boolean
          last_content_hash?: string | null
          last_crawled_at?: string | null
          last_success_at?: string | null
          name: string
          parser_hint?: string | null
          region?: string | null
          source_id?: string
          source_type?: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          consecutive_failures?: number
          created_at?: string
          frequency_hours?: number
          is_active?: boolean
          last_content_hash?: string | null
          last_crawled_at?: string | null
          last_success_at?: string | null
          name?: string
          parser_hint?: string | null
          region?: string | null
          source_id?: string
          source_type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      scholarship_stats: {
        Row: {
          last_refreshed_at: string
          save_count_30d: number
          save_count_7d: number
          save_count_total: number
          scholarship_id: string
          share_count_total: number
          trending_score: number
          view_count_30d: number
          view_count_7d: number
          view_count_total: number
        }
        Insert: {
          last_refreshed_at?: string
          save_count_30d?: number
          save_count_7d?: number
          save_count_total?: number
          scholarship_id: string
          share_count_total?: number
          trending_score?: number
          view_count_30d?: number
          view_count_7d?: number
          view_count_total?: number
        }
        Update: {
          last_refreshed_at?: string
          save_count_30d?: number
          save_count_7d?: number
          save_count_total?: number
          scholarship_id?: string
          share_count_total?: number
          trending_score?: number
          view_count_30d?: number
          view_count_7d?: number
          view_count_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_stats_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_stats_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_stats_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      scholarship_submissions: {
        Row: {
          application_deadline: string | null
          award_amount_text: string | null
          coverage_type: string | null
          created_at: string
          host_country: string | null
          notes: string | null
          official_url: string
          promoted_to: string | null
          provider_name: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scholarship_name: string
          status: string
          submission_id: string
          submitted_by: string | null
          submitter_email: string | null
          submitter_name: string | null
          target_degree_level: string[] | null
          target_fields: string[] | null
        }
        Insert: {
          application_deadline?: string | null
          award_amount_text?: string | null
          coverage_type?: string | null
          created_at?: string
          host_country?: string | null
          notes?: string | null
          official_url: string
          promoted_to?: string | null
          provider_name?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scholarship_name: string
          status?: string
          submission_id?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
        }
        Update: {
          application_deadline?: string | null
          award_amount_text?: string | null
          coverage_type?: string | null
          created_at?: string
          host_country?: string | null
          notes?: string | null
          official_url?: string
          promoted_to?: string | null
          provider_name?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scholarship_name?: string
          status?: string
          submission_id?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_submissions_promoted_to_fkey"
            columns: ["promoted_to"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_submissions_promoted_to_fkey"
            columns: ["promoted_to"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_submissions_promoted_to_fkey"
            columns: ["promoted_to"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      scholarships: {
        Row: {
          age_limit: string | null
          application_deadline: string | null
          application_fee_text: string | null
          application_platform: string | null
          award_amount_text: string | null
          award_type: string[] | null
          best_for_tags: string[] | null
          citizenship_requirements: string | null
          common_rejection_reasons: string | null
          coverage_type: string
          created_at: string | null
          data_source: string
          deadline_type: string | null
          duration_text: string | null
          effort_level: string | null
          effort_reason: string | null
          eligibility_requirements: string | null
          eligible_countries: string[] | null
          embedded_at: string | null
          embedding: string | null
          embedding_source_text: string | null
          essay_required: boolean | null
          estimated_total_value_usd: number | null
          extracurricular_required: boolean | null
          financial_need_required: boolean | null
          gpa_scale: number | null
          host_country: string | null
          how_to_win: string | null
          ideal_candidate_profile: string | null
          interview_required: boolean | null
          is_featured: boolean
          language_requirements: string | null
          last_verified_date: string | null
          leadership_required: boolean | null
          min_act: number | null
          min_gpa: number | null
          min_ielts: number | null
          min_sat: number | null
          min_toefl: number | null
          next_step: string | null
          official_url: string | null
          partner_universities: string[] | null
          priority_level: string | null
          provider_name: string | null
          recommendation_letters_required: number | null
          renewable: boolean | null
          required_documents: string[] | null
          risk_note: string | null
          scholarship_id: string
          scholarship_name: string
          selectivity_level: string | null
          separate_application_required: boolean | null
          stipend_amount: number | null
          strategy_notes: string | null
          target_degree_level: string[] | null
          target_fields: string[] | null
          university_id: string | null
          url_check_http_code: number | null
          url_check_status: string | null
          url_consecutive_fails: number
          url_last_checked_at: string | null
          url_resolved_to: string | null
          verified: boolean
          weak_candidate_warning: string | null
          what_to_prepare_first: string | null
          why_this_fits: string | null
        }
        Insert: {
          age_limit?: string | null
          application_deadline?: string | null
          application_fee_text?: string | null
          application_platform?: string | null
          award_amount_text?: string | null
          award_type?: string[] | null
          best_for_tags?: string[] | null
          citizenship_requirements?: string | null
          common_rejection_reasons?: string | null
          coverage_type: string
          created_at?: string | null
          data_source?: string
          deadline_type?: string | null
          duration_text?: string | null
          effort_level?: string | null
          effort_reason?: string | null
          eligibility_requirements?: string | null
          eligible_countries?: string[] | null
          embedded_at?: string | null
          embedding?: string | null
          embedding_source_text?: string | null
          essay_required?: boolean | null
          estimated_total_value_usd?: number | null
          extracurricular_required?: boolean | null
          financial_need_required?: boolean | null
          gpa_scale?: number | null
          host_country?: string | null
          how_to_win?: string | null
          ideal_candidate_profile?: string | null
          interview_required?: boolean | null
          is_featured?: boolean
          language_requirements?: string | null
          last_verified_date?: string | null
          leadership_required?: boolean | null
          min_act?: number | null
          min_gpa?: number | null
          min_ielts?: number | null
          min_sat?: number | null
          min_toefl?: number | null
          next_step?: string | null
          official_url?: string | null
          partner_universities?: string[] | null
          priority_level?: string | null
          provider_name?: string | null
          recommendation_letters_required?: number | null
          renewable?: boolean | null
          required_documents?: string[] | null
          risk_note?: string | null
          scholarship_id?: string
          scholarship_name: string
          selectivity_level?: string | null
          separate_application_required?: boolean | null
          stipend_amount?: number | null
          strategy_notes?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
          university_id?: string | null
          url_check_http_code?: number | null
          url_check_status?: string | null
          url_consecutive_fails?: number
          url_last_checked_at?: string | null
          url_resolved_to?: string | null
          verified?: boolean
          weak_candidate_warning?: string | null
          what_to_prepare_first?: string | null
          why_this_fits?: string | null
        }
        Update: {
          age_limit?: string | null
          application_deadline?: string | null
          application_fee_text?: string | null
          application_platform?: string | null
          award_amount_text?: string | null
          award_type?: string[] | null
          best_for_tags?: string[] | null
          citizenship_requirements?: string | null
          common_rejection_reasons?: string | null
          coverage_type?: string
          created_at?: string | null
          data_source?: string
          deadline_type?: string | null
          duration_text?: string | null
          effort_level?: string | null
          effort_reason?: string | null
          eligibility_requirements?: string | null
          eligible_countries?: string[] | null
          embedded_at?: string | null
          embedding?: string | null
          embedding_source_text?: string | null
          essay_required?: boolean | null
          estimated_total_value_usd?: number | null
          extracurricular_required?: boolean | null
          financial_need_required?: boolean | null
          gpa_scale?: number | null
          host_country?: string | null
          how_to_win?: string | null
          ideal_candidate_profile?: string | null
          interview_required?: boolean | null
          is_featured?: boolean
          language_requirements?: string | null
          last_verified_date?: string | null
          leadership_required?: boolean | null
          min_act?: number | null
          min_gpa?: number | null
          min_ielts?: number | null
          min_sat?: number | null
          min_toefl?: number | null
          next_step?: string | null
          official_url?: string | null
          partner_universities?: string[] | null
          priority_level?: string | null
          provider_name?: string | null
          recommendation_letters_required?: number | null
          renewable?: boolean | null
          required_documents?: string[] | null
          risk_note?: string | null
          scholarship_id?: string
          scholarship_name?: string
          selectivity_level?: string | null
          separate_application_required?: boolean | null
          stipend_amount?: number | null
          strategy_notes?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
          university_id?: string | null
          url_check_http_code?: number | null
          url_check_status?: string | null
          url_consecutive_fails?: number
          url_last_checked_at?: string | null
          url_resolved_to?: string | null
          verified?: boolean
          weak_candidate_warning?: string | null
          what_to_prepare_first?: string | null
          why_this_fits?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["university_id"]
          },
        ]
      }
      scholarships_research_intake: {
        Row: {
          age_limit: string | null
          application_deadline: string | null
          award_amount_text: string | null
          citizenship_requirements: string | null
          coverage_type: string | null
          deadline_type: string | null
          eligibility_requirements: string | null
          eligible_countries: string[] | null
          estimated_total_value_usd: number | null
          host_country: string | null
          ingested_at: string
          intake_id: string
          is_loadable: boolean
          live_scholarship_id: string | null
          official_url: string | null
          promoted_at: string | null
          promoted_to_live: boolean
          provider_name: string | null
          raw_annual_awards: string | null
          raw_coverage: string | null
          raw_criteria: string | null
          raw_deadline: string | null
          raw_education_levels: string | null
          raw_eligibility: string | null
          raw_offering_org: string | null
          raw_url: string | null
          scholarship_name: string
          selectivity_level: string | null
          source: string
          source_category: string | null
          target_degree_level: string[] | null
          target_fields: string[] | null
        }
        Insert: {
          age_limit?: string | null
          application_deadline?: string | null
          award_amount_text?: string | null
          citizenship_requirements?: string | null
          coverage_type?: string | null
          deadline_type?: string | null
          eligibility_requirements?: string | null
          eligible_countries?: string[] | null
          estimated_total_value_usd?: number | null
          host_country?: string | null
          ingested_at?: string
          intake_id?: string
          is_loadable?: boolean
          live_scholarship_id?: string | null
          official_url?: string | null
          promoted_at?: string | null
          promoted_to_live?: boolean
          provider_name?: string | null
          raw_annual_awards?: string | null
          raw_coverage?: string | null
          raw_criteria?: string | null
          raw_deadline?: string | null
          raw_education_levels?: string | null
          raw_eligibility?: string | null
          raw_offering_org?: string | null
          raw_url?: string | null
          scholarship_name: string
          selectivity_level?: string | null
          source: string
          source_category?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
        }
        Update: {
          age_limit?: string | null
          application_deadline?: string | null
          award_amount_text?: string | null
          citizenship_requirements?: string | null
          coverage_type?: string | null
          deadline_type?: string | null
          eligibility_requirements?: string | null
          eligible_countries?: string[] | null
          estimated_total_value_usd?: number | null
          host_country?: string | null
          ingested_at?: string
          intake_id?: string
          is_loadable?: boolean
          live_scholarship_id?: string | null
          official_url?: string | null
          promoted_at?: string | null
          promoted_to_live?: boolean
          provider_name?: string | null
          raw_annual_awards?: string | null
          raw_coverage?: string | null
          raw_criteria?: string | null
          raw_deadline?: string | null
          raw_education_levels?: string | null
          raw_eligibility?: string | null
          raw_offering_org?: string | null
          raw_url?: string | null
          scholarship_name?: string
          selectivity_level?: string | null
          source?: string
          source_category?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_research_intake_live_scholarship_id_fkey"
            columns: ["live_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarships_research_intake_live_scholarship_id_fkey"
            columns: ["live_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarships_research_intake_live_scholarship_id_fkey"
            columns: ["live_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      scholarships_staging: {
        Row: {
          confidence: number
          created_at: string
          diff_summary: string | null
          fingerprint: string
          parsed_data: Json
          raw_text: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string | null
          scholarship_id: string | null
          source_id: string
          staging_id: string
          status: string
        }
        Insert: {
          confidence: number
          created_at?: string
          diff_summary?: string | null
          fingerprint: string
          parsed_data: Json
          raw_text?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          scholarship_id?: string | null
          source_id: string
          staging_id?: string
          status?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          diff_summary?: string | null
          fingerprint?: string
          parsed_data?: Json
          raw_text?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          scholarship_id?: string | null
          source_id?: string
          staging_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_staging_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "scholarships_staging_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarships_staging_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarships_staging_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarships_staging_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "scholarship_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      scrape_errors: {
        Row: {
          context: Json | null
          created_at: string
          error_class: string | null
          error_id: string
          error_message: string | null
          http_status: number | null
          run_id: string | null
          source_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_class?: string | null
          error_id?: string
          error_message?: string | null
          http_status?: number | null
          run_id?: string | null
          source_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_class?: string | null
          error_id?: string
          error_message?: string | null
          http_status?: number | null
          run_id?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_errors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "scrape_errors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "scholarship_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      scrape_runs: {
        Row: {
          auto_published: number | null
          cost_estimate_usd: number | null
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          needs_review: number | null
          run_id: string
          scholarships_found: number | null
          scholarships_new: number | null
          scholarships_updated: number | null
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          auto_published?: number | null
          cost_estimate_usd?: number | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          needs_review?: number | null
          run_id?: string
          scholarships_found?: number | null
          scholarships_new?: number | null
          scholarships_updated?: number | null
          source_id: string
          started_at?: string
          status?: string
        }
        Update: {
          auto_published?: number | null
          cost_estimate_usd?: number | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          needs_review?: number | null
          run_id?: string
          scholarships_found?: number | null
          scholarships_new?: number | null
          scholarships_updated?: number | null
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "scholarship_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      shared_briefs: {
        Row: {
          brief_id: string
          content: string
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          is_public: boolean
          language: string
          profile_first_name: string | null
          profile_grade_level: string | null
          profile_major: string | null
          profile_target_countries: string[] | null
          report_grade: string
          slug: string
          view_count: number
        }
        Insert: {
          brief_id?: string
          content: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          is_public?: boolean
          language?: string
          profile_first_name?: string | null
          profile_grade_level?: string | null
          profile_major?: string | null
          profile_target_countries?: string[] | null
          report_grade?: string
          slug: string
          view_count?: number
        }
        Update: {
          brief_id?: string
          content?: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          is_public?: boolean
          language?: string
          profile_first_name?: string | null
          profile_grade_level?: string | null
          profile_major?: string | null
          profile_target_countries?: string[] | null
          report_grade?: string
          slug?: string
          view_count?: number
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          document_id: string
          extracted_text: string | null
          filename: string
          kind: string
          mime_type: string | null
          parse_error: string | null
          parse_status: string
          parsed_at: string | null
          size_bytes: number | null
          storage_path: string
          title: string | null
          updated_at: string
          uploaded_at: string
          use_in_counselor: boolean
          user_id: string
        }
        Insert: {
          document_id?: string
          extracted_text?: string | null
          filename: string
          kind: string
          mime_type?: string | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string | null
          size_bytes?: number | null
          storage_path: string
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          use_in_counselor?: boolean
          user_id: string
        }
        Update: {
          document_id?: string
          extracted_text?: string | null
          filename?: string
          kind?: string
          mime_type?: string | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          use_in_counselor?: boolean
          user_id?: string
        }
        Relationships: []
      }
      student_interactions: {
        Row: {
          country_hint: string | null
          created_at: string
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
        }
        Insert: {
          country_hint?: string | null
          created_at?: string
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
        }
        Update: {
          country_hint?: string | null
          created_at?: string
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          budget: string | null
          career_roi_weight: number | null
          created_at: string
          email: string | null
          field_of_study: string | null
          full_name: string | null
          gpa: number | null
          gpa_scale: number | null
          grade_level: string | null
          ielts: number | null
          last_nudge_sent_at: string | null
          location_weight: number | null
          major: string | null
          nationality: string | null
          nudge_opt_out: boolean
          prestige_weight: number | null
          sat: number | null
          scholarship_needed: boolean | null
          scholarship_weight: number | null
          target_countries: string[] | null
          timeline: string | null
          toefl: number | null
          updated_at: string
          user_id: string
          visa_weight: number | null
        }
        Insert: {
          budget?: string | null
          career_roi_weight?: number | null
          created_at?: string
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          gpa?: number | null
          gpa_scale?: number | null
          grade_level?: string | null
          ielts?: number | null
          last_nudge_sent_at?: string | null
          location_weight?: number | null
          major?: string | null
          nationality?: string | null
          nudge_opt_out?: boolean
          prestige_weight?: number | null
          sat?: number | null
          scholarship_needed?: boolean | null
          scholarship_weight?: number | null
          target_countries?: string[] | null
          timeline?: string | null
          toefl?: number | null
          updated_at?: string
          user_id: string
          visa_weight?: number | null
        }
        Update: {
          budget?: string | null
          career_roi_weight?: number | null
          created_at?: string
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          gpa?: number | null
          gpa_scale?: number | null
          grade_level?: string | null
          ielts?: number | null
          last_nudge_sent_at?: string | null
          location_weight?: number | null
          major?: string | null
          nationality?: string | null
          nudge_opt_out?: boolean
          prestige_weight?: number | null
          sat?: number | null
          scholarship_needed?: boolean | null
          scholarship_weight?: number | null
          target_countries?: string[] | null
          timeline?: string | null
          toefl?: number | null
          updated_at?: string
          user_id?: string
          visa_weight?: number | null
        }
        Relationships: []
      }
      student_tasks: {
        Row: {
          completed_at: string
          task_key: string
          task_text: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          task_key: string
          task_text?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          task_key?: string
          task_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          founding_member_number: number | null
          id: string
          is_founding_member: boolean
          metadata: Json | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          founding_member_number?: number | null
          id?: string
          is_founding_member?: boolean
          metadata?: Json | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          founding_member_number?: number | null
          id?: string
          is_founding_member?: boolean
          metadata?: Json | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          city: string
          cost_of_living_index: number | null
          country: string
          created_at: string | null
          foundation_year_available: boolean | null
          gap_year_accepted: boolean | null
          global_ranking: number | null
          language_of_instruction: string | null
          tuition_usd_per_year: number | null
          tuition_verified: boolean
          university_id: string
          university_name: string
          website_url: string | null
        }
        Insert: {
          city: string
          cost_of_living_index?: number | null
          country: string
          created_at?: string | null
          foundation_year_available?: boolean | null
          gap_year_accepted?: boolean | null
          global_ranking?: number | null
          language_of_instruction?: string | null
          tuition_usd_per_year?: number | null
          tuition_verified?: boolean
          university_id?: string
          university_name: string
          website_url?: string | null
        }
        Update: {
          city?: string
          cost_of_living_index?: number | null
          country?: string
          created_at?: string | null
          foundation_year_available?: boolean | null
          gap_year_accepted?: boolean | null
          global_ranking?: number | null
          language_of_instruction?: string | null
          tuition_usd_per_year?: number | null
          tuition_verified?: boolean
          university_id?: string
          university_name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      university_contacts: {
        Row: {
          contact_id: string
          contact_name: string | null
          contact_title: string | null
          contact_type: string
          created_at: string | null
          email: string | null
          linkedin_url: string | null
          notes: string | null
          office_hours: string | null
          phone: string | null
          response_time: string | null
          telegram: string | null
          university_id: string
          whatsapp: string | null
        }
        Insert: {
          contact_id?: string
          contact_name?: string | null
          contact_title?: string | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          linkedin_url?: string | null
          notes?: string | null
          office_hours?: string | null
          phone?: string | null
          response_time?: string | null
          telegram?: string | null
          university_id: string
          whatsapp?: string | null
        }
        Update: {
          contact_id?: string
          contact_name?: string | null
          contact_title?: string | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          linkedin_url?: string | null
          notes?: string | null
          office_hours?: string | null
          phone?: string | null
          response_time?: string | null
          telegram?: string | null
          university_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "university_contacts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["university_id"]
          },
        ]
      }
      university_insights: {
        Row: {
          alumni_network_strength: string | null
          application_tips: string | null
          average_starting_salary_usd: number | null
          campus_safety_score: number | null
          common_mistakes: string | null
          created_at: string | null
          employment_rate_6months: number | null
          housing_available: boolean | null
          housing_cost_monthly_usd: number | null
          industry_partnerships: string | null
          insight_id: string
          international_student_percent: number | null
          internship_opportunities: string | null
          notable_alumni: string | null
          post_grad_work_visa: string | null
          research_output_score: number | null
          student_clubs_count: number | null
          student_satisfaction_score: number | null
          university_id: string
          verified: boolean
        }
        Insert: {
          alumni_network_strength?: string | null
          application_tips?: string | null
          average_starting_salary_usd?: number | null
          campus_safety_score?: number | null
          common_mistakes?: string | null
          created_at?: string | null
          employment_rate_6months?: number | null
          housing_available?: boolean | null
          housing_cost_monthly_usd?: number | null
          industry_partnerships?: string | null
          insight_id?: string
          international_student_percent?: number | null
          internship_opportunities?: string | null
          notable_alumni?: string | null
          post_grad_work_visa?: string | null
          research_output_score?: number | null
          student_clubs_count?: number | null
          student_satisfaction_score?: number | null
          university_id: string
          verified?: boolean
        }
        Update: {
          alumni_network_strength?: string | null
          application_tips?: string | null
          average_starting_salary_usd?: number | null
          campus_safety_score?: number | null
          common_mistakes?: string | null
          created_at?: string | null
          employment_rate_6months?: number | null
          housing_available?: boolean | null
          housing_cost_monthly_usd?: number | null
          industry_partnerships?: string | null
          insight_id?: string
          international_student_percent?: number | null
          internship_opportunities?: string | null
          notable_alumni?: string | null
          post_grad_work_visa?: string | null
          research_output_score?: number | null
          student_clubs_count?: number | null
          student_satisfaction_score?: number | null
          university_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "university_insights_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: true
            referencedRelation: "universities"
            referencedColumns: ["university_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      scholarships_needing_embedding: {
        Row: {
          scholarship_id: string | null
          source_text: string | null
        }
        Insert: {
          scholarship_id?: string | null
          source_text?: never
        }
        Update: {
          scholarship_id?: string | null
          source_text?: never
        }
        Relationships: []
      }
      scholarships_url_check_queue: {
        Row: {
          official_url: string | null
          scholarship_id: string | null
          url_consecutive_fails: number | null
          url_last_checked_at: string | null
        }
        Insert: {
          official_url?: string | null
          scholarship_id?: string | null
          url_consecutive_fails?: number | null
          url_last_checked_at?: string | null
        }
        Update: {
          official_url?: string | null
          scholarship_id?: string | null
          url_consecutive_fails?: number | null
          url_last_checked_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_increment_rate_limit: {
        Args: { p_key: string; p_max_per_minute: number }
        Returns: boolean
      }
      claim_founding_member_slot: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_old_shared_briefs: { Args: never; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      get_or_create_my_referral_code: { Args: never; Returns: string }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_brief_view: { Args: { p_slug: string }; Returns: undefined }
      increment_referral_total_uses: {
        Args: { p_code: string }
        Returns: undefined
      }
      match_scholarships: {
        Args: {
          p_degree_level?: string
          p_max_results?: number
          p_min_gpa?: number
          p_min_ielts?: number
          p_nationality?: string
          query_embedding: string
        }
        Returns: {
          passes_eligibility: boolean
          scholarship_id: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_scholarship_stats: { Args: never; Returns: number }
      scholarship_embedding_source: {
        Args: { s: Database["public"]["Tables"]["scholarships"]["Row"] }
        Returns: string
      }
      scholarship_passes_eligibility: {
        Args: {
          p_degree_level: string
          p_min_gpa: number
          p_min_ielts: number
          p_nationality: string
          s: Database["public"]["Tables"]["scholarships"]["Row"]
        }
        Returns: boolean
      }
      track_scholarship_event: {
        Args: {
          p_anonymous_id?: string
          p_context?: Json
          p_event_type: string
          p_scholarship_id: string
          p_source?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
        | "paused"
      subscription_tier: "free" | "pro" | "founding"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
      ],
      subscription_tier: ["free", "pro", "founding"],
    },
  },
} as const
