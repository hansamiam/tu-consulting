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
      academy_resources: {
        Row: {
          access_tier: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          external_url: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          is_published: boolean
          language: string
          mime_type: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          access_tier?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          is_published?: boolean
          language?: string
          mime_type?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_tier?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          is_published?: boolean
          language?: string
          mime_type?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_waitlist: {
        Row: {
          confirmation_sent_at: string | null
          email: string
          full_name: string | null
          ip_hash: string | null
          joined_academy_at: string | null
          match_run_id: string | null
          profile_snapshot: Json | null
          referring_scholarship_id: string | null
          signed_up_at: string
          source: string
          unsubscribed_at: string | null
          user_agent_hash: string | null
          user_id: string | null
          waitlist_id: string
        }
        Insert: {
          confirmation_sent_at?: string | null
          email: string
          full_name?: string | null
          ip_hash?: string | null
          joined_academy_at?: string | null
          match_run_id?: string | null
          profile_snapshot?: Json | null
          referring_scholarship_id?: string | null
          signed_up_at?: string
          source: string
          unsubscribed_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
          waitlist_id?: string
        }
        Update: {
          confirmation_sent_at?: string | null
          email?: string
          full_name?: string | null
          ip_hash?: string | null
          joined_academy_at?: string | null
          match_run_id?: string | null
          profile_snapshot?: Json | null
          referring_scholarship_id?: string | null
          signed_up_at?: string
          source?: string
          unsubscribed_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_waitlist_referring_scholarship_id_fkey"
            columns: ["referring_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "academy_waitlist_referring_scholarship_id_fkey"
            columns: ["referring_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_active_v"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "academy_waitlist_referring_scholarship_id_fkey"
            columns: ["referring_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "academy_waitlist_referring_scholarship_id_fkey"
            columns: ["referring_scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      academy_workshops: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          join_url: string | null
          kind: string
          recording_url: string | null
          scheduled_for: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          join_url?: string | null
          kind: string
          recording_url?: string | null
          scheduled_for?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          join_url?: string | null
          kind?: string
          recording_url?: string | null
          scheduled_for?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admission_requirements: {
        Row: {
          application_deadline: string | null
          created_at: string | null
          enriched_at: string | null
          enrichment_metadata: Json | null
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
          enriched_at?: string | null
          enrichment_metadata?: Json | null
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
          enriched_at?: string | null
          enrichment_metadata?: Json | null
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
      analytics_events: {
        Row: {
          anon_id: string | null
          created_at: string
          event_id: number
          event_name: string
          metadata: Json | null
          path: string | null
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string
          event_id?: number
          event_name: string
          metadata?: Json | null
          path?: string | null
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string
          event_id?: number
          event_name?: string
          metadata?: Json | null
          path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      application_tracker: {
        Row: {
          additional_essays: Json | null
          awarded_amount_usd: number | null
          completed_checklist_ids: string[]
          created_at: string
          essay_draft: string | null
          hidden: boolean
          notes: string | null
          recommenders: Json | null
          reminder_sent_at: string | null
          scholarship_id: string
          shortlisted: boolean
          status: string | null
          status_changed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_essays?: Json | null
          awarded_amount_usd?: number | null
          completed_checklist_ids?: string[]
          created_at?: string
          essay_draft?: string | null
          hidden?: boolean
          notes?: string | null
          recommenders?: Json | null
          reminder_sent_at?: string | null
          scholarship_id: string
          shortlisted?: boolean
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_essays?: Json | null
          awarded_amount_usd?: number | null
          completed_checklist_ids?: string[]
          created_at?: string
          essay_draft?: string | null
          hidden?: boolean
          notes?: string | null
          recommenders?: Json | null
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
            referencedRelation: "scholarships_active_v"
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
          enriched_at: string | null
          enrichment_metadata: Json | null
          portal_url: string | null
          program_id: string
          visa_difficulty_score: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          application_id?: string
          created_at?: string | null
          enriched_at?: string | null
          enrichment_metadata?: Json | null
          portal_url?: string | null
          program_id: string
          visa_difficulty_score?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          application_id?: string
          created_at?: string | null
          enriched_at?: string | null
          enrichment_metadata?: Json | null
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
      brief_cache: {
        Row: {
          brief_schema_version: number
          content: string
          cost_estimate_usd: number | null
          generated_at: string
          grade: string
          language: string
          profile_hash: string
          prompt_version: string
          retrieval_method: string | null
          scholarship_ids: string[]
          user_id: string | null
        }
        Insert: {
          brief_schema_version?: number
          content: string
          cost_estimate_usd?: number | null
          generated_at?: string
          grade?: string
          language?: string
          profile_hash: string
          prompt_version?: string
          retrieval_method?: string | null
          scholarship_ids?: string[]
          user_id?: string | null
        }
        Update: {
          brief_schema_version?: number
          content?: string
          cost_estimate_usd?: number | null
          generated_at?: string
          grade?: string
          language?: string
          profile_hash?: string
          prompt_version?: string
          retrieval_method?: string | null
          scholarship_ids?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      brief_hallucinations: {
        Row: {
          best_fuzzy_match_against_name: string | null
          best_fuzzy_match_score: number | null
          created_at: string
          flagged_text: string
          hallucination_id: string
          match_run_id: string | null
          profile_hash: string | null
          retrieved_scholarship_ids: string[]
          source_function: string
          user_id: string | null
          was_redacted: boolean
        }
        Insert: {
          best_fuzzy_match_against_name?: string | null
          best_fuzzy_match_score?: number | null
          created_at?: string
          flagged_text: string
          hallucination_id?: string
          match_run_id?: string | null
          profile_hash?: string | null
          retrieved_scholarship_ids?: string[]
          source_function: string
          user_id?: string | null
          was_redacted?: boolean
        }
        Update: {
          best_fuzzy_match_against_name?: string | null
          best_fuzzy_match_score?: number | null
          created_at?: string
          flagged_text?: string
          hallucination_id?: string
          match_run_id?: string | null
          profile_hash?: string | null
          retrieved_scholarship_ids?: string[]
          source_function?: string
          user_id?: string | null
          was_redacted?: boolean
        }
        Relationships: []
      }
      brief_leads: {
        Row: {
          converted_at: string | null
          created_at: string
          email: string
          full_name: string | null
          gpa: string | null
          grade_level: string | null
          id: string
          language: string
          major: string | null
          nationality: string | null
          nudge_sent_at: string | null
          source_path: string | null
          target_countries: string[] | null
          user_agent: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          gpa?: string | null
          grade_level?: string | null
          id?: string
          language?: string
          major?: string | null
          nationality?: string | null
          nudge_sent_at?: string | null
          source_path?: string | null
          target_countries?: string[] | null
          user_agent?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          gpa?: string | null
          grade_level?: string | null
          id?: string
          language?: string
          major?: string | null
          nationality?: string | null
          nudge_sent_at?: string | null
          source_path?: string | null
          target_countries?: string[] | null
          user_agent?: string | null
        }
        Relationships: []
      }
      calendar_subscriptions: {
        Row: {
          created_at: string
          feed_token: string
          fetch_count: number
          last_accessed_at: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_token: string
          fetch_count?: number
          last_accessed_at?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feed_token?: string
          fetch_count?: number
          last_accessed_at?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compass_audits: {
        Row: {
          brand_id: string
          citation_rate: number | null
          cited_sources: Json | null
          competitor_summary: Json | null
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          is_public: boolean
          recommendations: Json | null
          share_of_voice: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          brand_id: string
          citation_rate?: number | null
          cited_sources?: Json | null
          competitor_summary?: Json | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          is_public?: boolean
          recommendations?: Json | null
          share_of_voice?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          brand_id?: string
          citation_rate?: number | null
          cited_sources?: Json | null
          competitor_summary?: Json | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          is_public?: boolean
          recommendations?: Json | null
          share_of_voice?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compass_audits_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "compass_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      compass_brands: {
        Row: {
          category: string | null
          competitors: string[] | null
          created_at: string
          display_name: string | null
          domain: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          display_name?: string | null
          domain: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          display_name?: string | null
          domain?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      compass_mentions: {
        Row: {
          created_at: string
          entity: string
          id: string
          is_target: boolean
          position: number | null
          prompt_run_id: string
          sentiment: string | null
          snippet: string | null
        }
        Insert: {
          created_at?: string
          entity: string
          id?: string
          is_target?: boolean
          position?: number | null
          prompt_run_id: string
          sentiment?: string | null
          snippet?: string | null
        }
        Update: {
          created_at?: string
          entity?: string
          id?: string
          is_target?: boolean
          position?: number | null
          prompt_run_id?: string
          sentiment?: string | null
          snippet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compass_mentions_prompt_run_id_fkey"
            columns: ["prompt_run_id"]
            isOneToOne: false
            referencedRelation: "compass_prompt_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      compass_prompt_runs: {
        Row: {
          citations: Json | null
          cost_usd: number | null
          created_at: string
          engine: string
          error_message: string | null
          id: string
          latency_ms: number | null
          prompt_id: string
          raw_response: string | null
        }
        Insert: {
          citations?: Json | null
          cost_usd?: number | null
          created_at?: string
          engine: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          prompt_id: string
          raw_response?: string | null
        }
        Update: {
          citations?: Json | null
          cost_usd?: number | null
          created_at?: string
          engine?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          prompt_id?: string
          raw_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compass_prompt_runs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "compass_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      compass_prompts: {
        Row: {
          audit_id: string
          created_at: string
          id: string
          intent: string | null
          text: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          id?: string
          intent?: string | null
          text: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          id?: string
          intent?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "compass_prompts_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "compass_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      compass_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
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
      featured_rotations: {
        Row: {
          created_at: string
          created_by: string | null
          override_headline: string | null
          override_subhead: string | null
          rotation_id: string
          scholarship_id: string
          slot_index: number
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          override_headline?: string | null
          override_subhead?: string | null
          rotation_id?: string
          scholarship_id: string
          slot_index: number
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          override_headline?: string | null
          override_subhead?: string | null
          rotation_id?: string
          scholarship_id?: string
          slot_index?: number
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_rotations_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "featured_rotations_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_active_v"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "featured_rotations_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "featured_rotations_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
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
      partner_inquiries: {
        Row: {
          contact_email: string
          created_at: string
          id: string
          institution_name: string
          language: string
          message: string | null
          notes: string | null
          region: string
          source_path: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          contact_email: string
          created_at?: string
          id?: string
          institution_name: string
          language?: string
          message?: string | null
          notes?: string | null
          region: string
          source_path?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          contact_email?: string
          created_at?: string
          id?: string
          institution_name?: string
          language?: string
          message?: string | null
          notes?: string | null
          region?: string
          source_path?: string | null
          status?: string
          user_agent?: string | null
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
          enriched_at: string | null
          enrichment_metadata: Json | null
          field_of_study: string
          program_id: string
          program_name: string
          university_id: string
        }
        Insert: {
          created_at?: string | null
          degree_level: string
          duration_years?: number | null
          enriched_at?: string | null
          enrichment_metadata?: Json | null
          field_of_study: string
          program_id?: string
          program_name: string
          university_id: string
        }
        Update: {
          created_at?: string | null
          degree_level?: string
          duration_years?: number | null
          enriched_at?: string | null
          enrichment_metadata?: Json | null
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
      provider_authoritative_facts: {
        Row: {
          canonical_url: string
          created_at: string
          discontinued_year: number | null
          eligibility_notes: string[] | null
          last_authoritative_check_at: string | null
          lifecycle_state: string
          max_age: number | null
          per_country_deadlines: boolean
          provider_slug: string
          region_label: string | null
          region_restricted_to: string[] | null
          successor_program: string | null
          typical_cycle_close_month: number | null
          typical_cycle_open_month: number | null
          updated_at: string
        }
        Insert: {
          canonical_url: string
          created_at?: string
          discontinued_year?: number | null
          eligibility_notes?: string[] | null
          last_authoritative_check_at?: string | null
          lifecycle_state?: string
          max_age?: number | null
          per_country_deadlines?: boolean
          provider_slug: string
          region_label?: string | null
          region_restricted_to?: string[] | null
          successor_program?: string | null
          typical_cycle_close_month?: number | null
          typical_cycle_open_month?: number | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string
          created_at?: string
          discontinued_year?: number | null
          eligibility_notes?: string[] | null
          last_authoritative_check_at?: string | null
          lifecycle_state?: string
          max_age?: number | null
          per_country_deadlines?: boolean
          provider_slug?: string
          region_label?: string | null
          region_restricted_to?: string[] | null
          successor_program?: string | null
          typical_cycle_close_month?: number | null
          typical_cycle_open_month?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_authoritative_facts_provider_slug_fkey"
            columns: ["provider_slug"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["slug"]
          },
        ]
      }
      providers: {
        Row: {
          active_scholarships_count: number
          avg_completeness_score: number | null
          canonical_name: string
          created_at: string
          description: string | null
          established_year: number | null
          host_country: string | null
          last_refreshed_at: string | null
          logo_url: string | null
          next_deadline: string | null
          official_website: string | null
          provider_id: string
          provider_type: string | null
          scholarships_count: number
          slug: string
          total_award_volume_usd: number
          trust_tier: string
        }
        Insert: {
          active_scholarships_count?: number
          avg_completeness_score?: number | null
          canonical_name: string
          created_at?: string
          description?: string | null
          established_year?: number | null
          host_country?: string | null
          last_refreshed_at?: string | null
          logo_url?: string | null
          next_deadline?: string | null
          official_website?: string | null
          provider_id?: string
          provider_type?: string | null
          scholarships_count?: number
          slug: string
          total_award_volume_usd?: number
          trust_tier?: string
        }
        Update: {
          active_scholarships_count?: number
          avg_completeness_score?: number | null
          canonical_name?: string
          created_at?: string
          description?: string | null
          established_year?: number | null
          host_country?: string | null
          last_refreshed_at?: string | null
          logo_url?: string | null
          next_deadline?: string | null
          official_website?: string | null
          provider_id?: string
          provider_type?: string | null
          scholarships_count?: number
          slug?: string
          total_award_volume_usd?: number
          trust_tier?: string
        }
        Relationships: []
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
      saved_searches: {
        Row: {
          alert_enabled: boolean
          created_at: string
          filters: Json
          id: string
          last_alert_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          filters: Json
          id?: string
          last_alert_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_alert_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scholarship_checklists: {
        Row: {
          cost_estimate_usd: number | null
          generated_at: string
          items: Json
          model_tag: string | null
          schema_version: number
          scholarship_id: string
        }
        Insert: {
          cost_estimate_usd?: number | null
          generated_at?: string
          items: Json
          model_tag?: string | null
          schema_version?: number
          scholarship_id: string
        }
        Update: {
          cost_estimate_usd?: number | null
          generated_at?: string
          items?: Json
          model_tag?: string | null
          schema_version?: number
          scholarship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_checklists_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_checklists_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships_active_v"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_checklists_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_checklists_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: true
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
          },
        ]
      }
      scholarship_deep_dives: {
        Row: {
          content: Json
          cost_estimate_usd: number | null
          generated_at: string
          model_tag: string | null
          profile_hash: string
          schema_version: number
          scholarship_id: string
          user_id: string | null
        }
        Insert: {
          content: Json
          cost_estimate_usd?: number | null
          generated_at?: string
          model_tag?: string | null
          profile_hash: string
          schema_version?: number
          scholarship_id: string
          user_id?: string | null
        }
        Update: {
          content?: Json
          cost_estimate_usd?: number | null
          generated_at?: string
          model_tag?: string | null
          profile_hash?: string
          schema_version?: number
          scholarship_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_deep_dives_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_deep_dives_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_active_v"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_deep_dives_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_deep_dives_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_url_check_queue"
            referencedColumns: ["scholarship_id"]
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
            referencedRelation: "scholarships_active_v"
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
      scholarship_evidence: {
        Row: {
          authority: number
          confirms_fields: string[] | null
          extraction_confidence: number | null
          first_seen_at: string
          last_checked_at: string
          last_confirmed_at: string
          scholarship_id: string
          source_domain: string
          source_id: string
          source_type: string
          source_url: string
        }
        Insert: {
          authority?: number
          confirms_fields?: string[] | null
          extraction_confidence?: number | null
          first_seen_at?: string
          last_checked_at?: string
          last_confirmed_at?: string
          scholarship_id: string
          source_domain: string
          source_id?: string
          source_type: string
          source_url: string
        }
        Update: {
          authority?: number
          confirms_fields?: string[] | null
          extraction_confidence?: number | null
          first_seen_at?: string
          last_checked_at?: string
          last_confirmed_at?: string
          scholarship_id?: string
          source_domain?: string
          source_id?: string
          source_type?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_evidence_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_evidence_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_active_v"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_evidence_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships_needing_embedding"
            referencedColumns: ["scholarship_id"]
          },
          {
            foreignKeyName: "scholarship_evidence_scholarship_id_fkey"
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
          deactivated_at: string | null
          deactivation_policy_version: string | null
          deactivation_reason: string | null
          frequency_hours: number
          health_reason: string | null
          health_status: string
          is_active: boolean
          last_content_hash: string | null
          last_crawled_at: string | null
          last_evaluated_at: string | null
          last_success_at: string | null
          name: string
          parser_hint: string | null
          region: string | null
          source_id: string
          source_tier: string | null
          source_type: string
          sub_tier: string | null
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          consecutive_failures?: number
          created_at?: string
          deactivated_at?: string | null
          deactivation_policy_version?: string | null
          deactivation_reason?: string | null
          frequency_hours?: number
          health_reason?: string | null
          health_status?: string
          is_active?: boolean
          last_content_hash?: string | null
          last_crawled_at?: string | null
          last_evaluated_at?: string | null
          last_success_at?: string | null
          name: string
          parser_hint?: string | null
          region?: string | null
          source_id?: string
          source_tier?: string | null
          source_type?: string
          sub_tier?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          consecutive_failures?: number
          created_at?: string
          deactivated_at?: string | null
          deactivation_policy_version?: string | null
          deactivation_reason?: string | null
          frequency_hours?: number
          health_reason?: string | null
          health_status?: string
          is_active?: boolean
          last_content_hash?: string | null
          last_crawled_at?: string | null
          last_evaluated_at?: string | null
          last_success_at?: string | null
          name?: string
          parser_hint?: string | null
          region?: string | null
          source_id?: string
          source_tier?: string | null
          source_type?: string
          sub_tier?: string | null
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
            referencedRelation: "scholarships_active_v"
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
            referencedRelation: "scholarships_active_v"
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
          canonical_audit: Json | null
          canonical_deadline_at: string | null
          canonical_deadline_iso: string | null
          canonical_funding_at: string | null
          canonical_funding_text: string | null
          canonical_funding_usd: number | null
          canonical_key: string | null
          canonical_official_url: string | null
          canonical_official_url_at: string | null
          canonical_overview: string | null
          canonical_overview_at: string | null
          canonical_overview_source: string | null
          canonical_quality_score: number | null
          canonical_requirements: Json | null
          canonical_requirements_at: string | null
          citizenship_requirements: string | null
          common_rejection_reasons: string | null
          confidence: number | null
          consensus_score: number | null
          cover_image_url: string | null
          coverage_type: string
          created_at: string | null
          data_completeness_score: number | null
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
          gate_fail_reason: string | null
          gpa_scale: number | null
          host_country: string | null
          how_to_win: string | null
          ideal_candidate_profile: string | null
          interview_required: boolean | null
          is_featured: boolean
          is_published: boolean
          language_requirements: string | null
          last_gate_checked_at: string | null
          last_verified_at: string | null
          last_verified_date: string | null
          leadership_required: boolean | null
          lifecycle_status: string | null
          min_act: number | null
          min_gpa: number | null
          min_ielts: number | null
          min_sat: number | null
          min_toefl: number | null
          next_open_at: string | null
          next_step: string | null
          official_url: string | null
          official_url_is_aggregator: boolean | null
          partner_universities: string[] | null
          priority_level: string | null
          provider_id: string | null
          provider_name: string | null
          recommendation_letters_required: number | null
          renewable: boolean | null
          required_documents: string[] | null
          risk_note: string | null
          scholarship_id: string
          scholarship_name: string
          selectivity_level: string | null
          separate_application_required: boolean | null
          source_url: string | null
          stipend_amount: number | null
          strategy_notes: string | null
          target_degree_level: string[] | null
          target_demographics: string[] | null
          target_fields: string[] | null
          university_id: string | null
          updated_at: string
          url_check_http_code: number | null
          url_check_status: string | null
          url_consecutive_fails: number
          url_last_checked_at: string | null
          url_resolved_to: string | null
          verification_status: string | null
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
          canonical_audit?: Json | null
          canonical_deadline_at?: string | null
          canonical_deadline_iso?: string | null
          canonical_funding_at?: string | null
          canonical_funding_text?: string | null
          canonical_funding_usd?: number | null
          canonical_key?: string | null
          canonical_official_url?: string | null
          canonical_official_url_at?: string | null
          canonical_overview?: string | null
          canonical_overview_at?: string | null
          canonical_overview_source?: string | null
          canonical_quality_score?: number | null
          canonical_requirements?: Json | null
          canonical_requirements_at?: string | null
          citizenship_requirements?: string | null
          common_rejection_reasons?: string | null
          confidence?: number | null
          consensus_score?: number | null
          cover_image_url?: string | null
          coverage_type: string
          created_at?: string | null
          data_completeness_score?: number | null
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
          gate_fail_reason?: string | null
          gpa_scale?: number | null
          host_country?: string | null
          how_to_win?: string | null
          ideal_candidate_profile?: string | null
          interview_required?: boolean | null
          is_featured?: boolean
          is_published?: boolean
          language_requirements?: string | null
          last_gate_checked_at?: string | null
          last_verified_at?: string | null
          last_verified_date?: string | null
          leadership_required?: boolean | null
          lifecycle_status?: string | null
          min_act?: number | null
          min_gpa?: number | null
          min_ielts?: number | null
          min_sat?: number | null
          min_toefl?: number | null
          next_open_at?: string | null
          next_step?: string | null
          official_url?: string | null
          official_url_is_aggregator?: boolean | null
          partner_universities?: string[] | null
          priority_level?: string | null
          provider_id?: string | null
          provider_name?: string | null
          recommendation_letters_required?: number | null
          renewable?: boolean | null
          required_documents?: string[] | null
          risk_note?: string | null
          scholarship_id?: string
          scholarship_name: string
          selectivity_level?: string | null
          separate_application_required?: boolean | null
          source_url?: string | null
          stipend_amount?: number | null
          strategy_notes?: string | null
          target_degree_level?: string[] | null
          target_demographics?: string[] | null
          target_fields?: string[] | null
          university_id?: string | null
          updated_at?: string
          url_check_http_code?: number | null
          url_check_status?: string | null
          url_consecutive_fails?: number
          url_last_checked_at?: string | null
          url_resolved_to?: string | null
          verification_status?: string | null
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
          canonical_audit?: Json | null
          canonical_deadline_at?: string | null
          canonical_deadline_iso?: string | null
          canonical_funding_at?: string | null
          canonical_funding_text?: string | null
          canonical_funding_usd?: number | null
          canonical_key?: string | null
          canonical_official_url?: string | null
          canonical_official_url_at?: string | null
          canonical_overview?: string | null
          canonical_overview_at?: string | null
          canonical_overview_source?: string | null
          canonical_quality_score?: number | null
          canonical_requirements?: Json | null
          canonical_requirements_at?: string | null
          citizenship_requirements?: string | null
          common_rejection_reasons?: string | null
          confidence?: number | null
          consensus_score?: number | null
          cover_image_url?: string | null
          coverage_type?: string
          created_at?: string | null
          data_completeness_score?: number | null
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
          gate_fail_reason?: string | null
          gpa_scale?: number | null
          host_country?: string | null
          how_to_win?: string | null
          ideal_candidate_profile?: string | null
          interview_required?: boolean | null
          is_featured?: boolean
          is_published?: boolean
          language_requirements?: string | null
          last_gate_checked_at?: string | null
          last_verified_at?: string | null
          last_verified_date?: string | null
          leadership_required?: boolean | null
          lifecycle_status?: string | null
          min_act?: number | null
          min_gpa?: number | null
          min_ielts?: number | null
          min_sat?: number | null
          min_toefl?: number | null
          next_open_at?: string | null
          next_step?: string | null
          official_url?: string | null
          official_url_is_aggregator?: boolean | null
          partner_universities?: string[] | null
          priority_level?: string | null
          provider_id?: string | null
          provider_name?: string | null
          recommendation_letters_required?: number | null
          renewable?: boolean | null
          required_documents?: string[] | null
          risk_note?: string | null
          scholarship_id?: string
          scholarship_name?: string
          selectivity_level?: string | null
          separate_application_required?: boolean | null
          source_url?: string | null
          stipend_amount?: number | null
          strategy_notes?: string | null
          target_degree_level?: string[] | null
          target_demographics?: string[] | null
          target_fields?: string[] | null
          university_id?: string | null
          updated_at?: string
          url_check_http_code?: number | null
          url_check_status?: string | null
          url_consecutive_fails?: number
          url_last_checked_at?: string | null
          url_resolved_to?: string | null
          verification_status?: string | null
          verified?: boolean
          weak_candidate_warning?: string | null
          what_to_prepare_first?: string | null
          why_this_fits?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_provider_fk"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["provider_id"]
          },
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
            referencedRelation: "scholarships_active_v"
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
          fingerprint: string | null
          parsed_data: Json
          raw_text: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string | null
          scholarship_id: string | null
          source_id: string | null
          staging_id: string
          status: string
        }
        Insert: {
          confidence: number
          created_at?: string
          diff_summary?: string | null
          fingerprint?: string | null
          parsed_data: Json
          raw_text?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          scholarship_id?: string | null
          source_id?: string | null
          staging_id?: string
          status?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          diff_summary?: string | null
          fingerprint?: string | null
          parsed_data?: Json
          raw_text?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          scholarship_id?: string | null
          source_id?: string | null
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
            referencedRelation: "scholarships_active_v"
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
          {
            foreignKeyName: "scholarships_staging_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "source_quality_v"
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
          {
            foreignKeyName: "scrape_errors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "source_quality_v"
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
          {
            foreignKeyName: "scrape_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "source_quality_v"
            referencedColumns: ["source_id"]
          },
        ]
      }
      shared_briefs: {
        Row: {
          brief_id: string
          brief_schema_version: number
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
          brief_schema_version?: number
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
          brief_schema_version?: number
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
      source_candidates: {
        Row: {
          candidate_id: string
          candidate_official_url: string
          created_at: string
          discovered_from_source_id: string | null
          discovered_from_url: string
          extraction_confidence: number | null
          extraction_notes: string | null
          promoted_to_source_id: string | null
          proposed_award_amount_text: string | null
          proposed_coverage_type: string | null
          proposed_deadline: string | null
          proposed_host_country: string | null
          proposed_name: string | null
          proposed_provider: string | null
          rejected_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id?: string
          candidate_official_url: string
          created_at?: string
          discovered_from_source_id?: string | null
          discovered_from_url: string
          extraction_confidence?: number | null
          extraction_notes?: string | null
          promoted_to_source_id?: string | null
          proposed_award_amount_text?: string | null
          proposed_coverage_type?: string | null
          proposed_deadline?: string | null
          proposed_host_country?: string | null
          proposed_name?: string | null
          proposed_provider?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          candidate_official_url?: string
          created_at?: string
          discovered_from_source_id?: string | null
          discovered_from_url?: string
          extraction_confidence?: number | null
          extraction_notes?: string | null
          promoted_to_source_id?: string | null
          proposed_award_amount_text?: string | null
          proposed_coverage_type?: string | null
          proposed_deadline?: string | null
          proposed_host_country?: string | null
          proposed_name?: string | null
          proposed_provider?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_candidates_discovered_from_source_id_fkey"
            columns: ["discovered_from_source_id"]
            isOneToOne: false
            referencedRelation: "scholarship_sources"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "source_candidates_discovered_from_source_id_fkey"
            columns: ["discovered_from_source_id"]
            isOneToOne: false
            referencedRelation: "source_quality_v"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "source_candidates_promoted_to_source_id_fkey"
            columns: ["promoted_to_source_id"]
            isOneToOne: false
            referencedRelation: "scholarship_sources"
            referencedColumns: ["source_id"]
          },
          {
            foreignKeyName: "source_candidates_promoted_to_source_id_fkey"
            columns: ["promoted_to_source_id"]
            isOneToOne: false
            referencedRelation: "source_quality_v"
            referencedColumns: ["source_id"]
          },
        ]
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
          last_brief_generated_at: string | null
          last_nudge_sent_at: string | null
          location_weight: number | null
          major: string | null
          nationality: string | null
          nudge_opt_out: boolean
          prestige_weight: number | null
          pro_nudge_sent_at: string | null
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
          last_brief_generated_at?: string | null
          last_nudge_sent_at?: string | null
          location_weight?: number | null
          major?: string | null
          nationality?: string | null
          nudge_opt_out?: boolean
          prestige_weight?: number | null
          pro_nudge_sent_at?: string | null
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
          last_brief_generated_at?: string | null
          last_nudge_sent_at?: string | null
          location_weight?: number | null
          major?: string | null
          nationality?: string | null
          nudge_opt_out?: boolean
          prestige_weight?: number | null
          pro_nudge_sent_at?: string | null
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
          enriched_at: string | null
          enrichment_metadata: Json | null
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
          enriched_at?: string | null
          enrichment_metadata?: Json | null
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
          enriched_at?: string | null
          enrichment_metadata?: Json | null
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
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      analytics_events_funnel_v: {
        Row: {
          day: string | null
          event_count: number | null
          event_name: string | null
          unique_anons: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      scholarship_verification_coverage_v: {
        Row: {
          broken_count: number | null
          have_source_url: number | null
          pending_count: number | null
          stale_count: number | null
          total_scholarships: number | null
          verified_count: number | null
          verified_in_last_30d: number | null
        }
        Relationships: []
      }
      scholarships_active_v: {
        Row: {
          age_limit: string | null
          application_deadline: string | null
          application_fee_text: string | null
          application_platform: string | null
          award_amount_text: string | null
          award_type: string[] | null
          best_for_tags: string[] | null
          canonical_key: string | null
          citizenship_requirements: string | null
          common_rejection_reasons: string | null
          coverage_type: string | null
          created_at: string | null
          data_source: string | null
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
          is_featured: boolean | null
          language_requirements: string | null
          last_verified_at: string | null
          last_verified_date: string | null
          leadership_required: boolean | null
          lifecycle_status: string | null
          min_act: number | null
          min_gpa: number | null
          min_ielts: number | null
          min_sat: number | null
          min_toefl: number | null
          next_open_at: string | null
          next_step: string | null
          official_url: string | null
          partner_universities: string[] | null
          priority_level: string | null
          provider_name: string | null
          recommendation_letters_required: number | null
          renewable: boolean | null
          required_documents: string[] | null
          risk_note: string | null
          scholarship_id: string | null
          scholarship_name: string | null
          selectivity_level: string | null
          separate_application_required: boolean | null
          source_url: string | null
          stipend_amount: number | null
          strategy_notes: string | null
          target_degree_level: string[] | null
          target_fields: string[] | null
          university_id: string | null
          updated_at: string | null
          url_check_http_code: number | null
          url_check_status: string | null
          url_consecutive_fails: number | null
          url_last_checked_at: string | null
          url_resolved_to: string | null
          verification_status: string | null
          verified: boolean | null
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
          canonical_key?: string | null
          citizenship_requirements?: string | null
          common_rejection_reasons?: string | null
          coverage_type?: string | null
          created_at?: string | null
          data_source?: string | null
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
          is_featured?: boolean | null
          language_requirements?: string | null
          last_verified_at?: string | null
          last_verified_date?: string | null
          leadership_required?: boolean | null
          lifecycle_status?: string | null
          min_act?: number | null
          min_gpa?: number | null
          min_ielts?: number | null
          min_sat?: number | null
          min_toefl?: number | null
          next_open_at?: string | null
          next_step?: string | null
          official_url?: string | null
          partner_universities?: string[] | null
          priority_level?: string | null
          provider_name?: string | null
          recommendation_letters_required?: number | null
          renewable?: boolean | null
          required_documents?: string[] | null
          risk_note?: string | null
          scholarship_id?: string | null
          scholarship_name?: string | null
          selectivity_level?: string | null
          separate_application_required?: boolean | null
          source_url?: string | null
          stipend_amount?: number | null
          strategy_notes?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
          university_id?: string | null
          updated_at?: string | null
          url_check_http_code?: number | null
          url_check_status?: string | null
          url_consecutive_fails?: number | null
          url_last_checked_at?: string | null
          url_resolved_to?: string | null
          verification_status?: string | null
          verified?: boolean | null
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
          canonical_key?: string | null
          citizenship_requirements?: string | null
          common_rejection_reasons?: string | null
          coverage_type?: string | null
          created_at?: string | null
          data_source?: string | null
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
          is_featured?: boolean | null
          language_requirements?: string | null
          last_verified_at?: string | null
          last_verified_date?: string | null
          leadership_required?: boolean | null
          lifecycle_status?: string | null
          min_act?: number | null
          min_gpa?: number | null
          min_ielts?: number | null
          min_sat?: number | null
          min_toefl?: number | null
          next_open_at?: string | null
          next_step?: string | null
          official_url?: string | null
          partner_universities?: string[] | null
          priority_level?: string | null
          provider_name?: string | null
          recommendation_letters_required?: number | null
          renewable?: boolean | null
          required_documents?: string[] | null
          risk_note?: string | null
          scholarship_id?: string | null
          scholarship_name?: string | null
          selectivity_level?: string | null
          separate_application_required?: boolean | null
          source_url?: string | null
          stipend_amount?: number | null
          strategy_notes?: string | null
          target_degree_level?: string[] | null
          target_fields?: string[] | null
          university_id?: string | null
          updated_at?: string | null
          url_check_http_code?: number | null
          url_check_status?: string | null
          url_consecutive_fails?: number | null
          url_last_checked_at?: string | null
          url_resolved_to?: string | null
          verification_status?: string | null
          verified?: boolean | null
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
      source_quality_v: {
        Row: {
          auto_publish_rate_60d: number | null
          avg_confidence_60d: number | null
          name: string | null
          pending_review_60d: number | null
          rows_last_60d: number | null
          source_id: string | null
        }
        Relationships: []
      }
      university_enrichment_coverage_v: {
        Row: {
          enriched_count: number | null
          enriched_recent_count: number | null
          have_ranking: number | null
          have_tuition: number | null
          total_universities: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _append_variants_note: {
        Args: { p_scholarship_id: string; p_variants: string[] }
        Returns: undefined
      }
      _canonicalize_field: { Args: { f: string }; Returns: string }
      app_cron_token: { Args: never; Returns: string }
      canonicalize_field_array: { Args: { p_arr: string[] }; Returns: string[] }
      canonicalize_field_of_study: { Args: { p_raw: string }; Returns: string }
      canonicalize_provider: { Args: { p_raw: string }; Returns: string }
      check_and_increment_rate_limit: {
        Args: { p_key: string; p_max_per_minute: number }
        Returns: boolean
      }
      claim_founding_member_slot: { Args: never; Returns: number }
      compute_completeness_score: {
        Args: { s: Database["public"]["Tables"]["scholarships"]["Row"] }
        Returns: number
      }
      compute_consensus_score: {
        Args: { p_scholarship_id: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      detect_scholarship_anomalies: {
        Args: never
        Returns: {
          rows_flagged: number
          rule_name: string
        }[]
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      evaluate_publish_gate_for: {
        Args: { p_scholarship_id: string }
        Returns: undefined
      }
      evaluate_source_health: {
        Args: never
        Returns: {
          out_name: string
          out_reason: string
          out_source_id: string
          out_status: string
        }[]
      }
      expire_old_shared_briefs: { Args: never; Returns: number }
      generate_calendar_feed_token: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_or_create_my_calendar_token: { Args: never; Returns: string }
      get_or_create_my_referral_code: { Args: never; Returns: string }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heal_broken_scholarships: {
        Args: never
        Returns: {
          healed_count: number
        }[]
      }
      increment_brief_view: { Args: { p_slug: string }; Returns: undefined }
      increment_referral_total_uses: {
        Args: { p_code: string }
        Returns: undefined
      }
      infer_degree_levels: {
        Args: { p_name: string; p_provider: string }
        Returns: string[]
      }
      infer_host_country: {
        Args: { p_name: string; p_provider: string }
        Returns: string
      }
      infer_source_type: {
        Args: { p_hint?: string; p_url: string }
        Returns: {
          authority: number
          source_domain: string
          source_type: string
        }[]
      }
      is_aggregator_url: { Args: { url: string }; Returns: boolean }
      is_topuni_founder: { Args: never; Returns: boolean }
      known_program_value_usd: {
        Args: { p_name: string; p_provider: string }
        Returns: number
      }
      match_scholarships: {
        Args: {
          p_degree_level?: string
          p_max_results?: number
          p_min_gpa?: number
          p_min_ielts?: number
          p_min_sat?: number
          p_min_toefl?: number
          p_nationality?: string
          query_embedding: string
        }
        Returns: {
          passes_eligibility: boolean
          scholarship_id: string
          similarity: number
        }[]
      }
      match_score_breakdown: {
        Args: {
          p_degree_level?: string
          p_min_gpa?: number
          p_min_ielts?: number
          p_nationality?: string
          query_embedding: string
          scholarship_id: string
        }
        Returns: {
          completeness_boost: number
          completeness_reason: string
          composite_score: number
          confidence_adj: number
          confidence_reason: string
          consensus_boost: number
          consensus_reason: string
          deadline_boost: number
          deadline_reason: string
          eligibility_reason: string
          engagement_boost: number
          engagement_reason: string
          passes_eligibility: boolean
          provider_trust_boost: number
          provider_trust_reason: string
          recency_boost: number
          recency_reason: string
          similarity: number
          similarity_reason: string
          value_boost: number
          value_reason: string
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
      next_annual_occurrence: { Args: { d: string }; Returns: string }
      normalize_scholarship_key: {
        Args: { p_country: string; p_name: string; p_provider: string }
        Returns: string
      }
      normalize_scholarship_name_only: {
        Args: { p_name: string }
        Returns: string
      }
      normalize_tags: { Args: { p_tags: string[] }; Returns: string[] }
      normalize_target_field: { Args: { raw: string }; Returns: string }
      provider_slug: { Args: { p_name: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_scholarship_source: {
        Args: {
          p_confidence?: number
          p_confirms?: string[]
          p_scholarship_id: string
          p_source_hint?: string
          p_source_url: string
        }
        Returns: string
      }
      refresh_lifecycle_status: { Args: never; Returns: undefined }
      refresh_provider_stats: { Args: never; Returns: number }
      refresh_scholarship_stats: { Args: never; Returns: number }
      roll_forward_annual_deadlines: { Args: never; Returns: number }
      rotate_my_calendar_token: { Args: never; Returns: string }
      scholarship_embedding_source: {
        Args: { s: Database["public"]["Tables"]["scholarships"]["Row"] }
        Returns: string
      }
      scholarship_lifecycle: {
        Args: { p_deadline: string; p_deadline_type: string }
        Returns: string
      }
      scholarship_next_open: {
        Args: { p_deadline: string; p_deadline_type: string }
        Returns: string
      }
      scholarship_outcomes: {
        Args: { p_scholarship_id: string }
        Returns: {
          accepted_count: number
          applied_count: number
          in_pipeline_count: number
          total_awarded_usd: number
        }[]
      }
      scholarship_outcomes_bulk: {
        Args: { p_scholarship_ids: string[] }
        Returns: {
          accepted_count: number
          applied_count: number
          in_pipeline_count: number
          scholarship_id: string
        }[]
      }
      scholarship_passes_eligibility: {
        Args: {
          p_degree_level: string
          p_min_gpa: number
          p_min_ielts: number
          p_min_sat?: number
          p_min_toefl?: number
          p_nationality: string
          s: Database["public"]["Tables"]["scholarships"]["Row"]
        }
        Returns: boolean
      }
      topuni_outcomes_aggregate: {
        Args: never
        Returns: {
          accepted_count: number
          member_count: number
          total_awarded_usd: number
        }[]
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
      tune_source_cadence: {
        Args: never
        Returns: {
          out_name: string
          out_new_freq: number
          out_old_freq: number
          out_reason: string
          out_source_id: string
          out_yield_pct: number
        }[]
      }
      upsert_provider: { Args: { p_raw_name: string }; Returns: string }
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
