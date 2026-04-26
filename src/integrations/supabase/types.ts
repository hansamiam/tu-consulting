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
    PostgrestVersion: "13.0.5"
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
          deadline_type: string | null
          duration_text: string | null
          effort_level: string | null
          effort_reason: string | null
          eligibility_requirements: string | null
          eligible_countries: string[] | null
          essay_required: boolean | null
          estimated_total_value_usd: number | null
          extracurricular_required: boolean | null
          financial_need_required: boolean | null
          gpa_scale: number | null
          host_country: string | null
          how_to_win: string | null
          ideal_candidate_profile: string | null
          interview_required: boolean | null
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
          university_id: string
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
          deadline_type?: string | null
          duration_text?: string | null
          effort_level?: string | null
          effort_reason?: string | null
          eligibility_requirements?: string | null
          eligible_countries?: string[] | null
          essay_required?: boolean | null
          estimated_total_value_usd?: number | null
          extracurricular_required?: boolean | null
          financial_need_required?: boolean | null
          gpa_scale?: number | null
          host_country?: string | null
          how_to_win?: string | null
          ideal_candidate_profile?: string | null
          interview_required?: boolean | null
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
          university_id: string
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
          deadline_type?: string | null
          duration_text?: string | null
          effort_level?: string | null
          effort_reason?: string | null
          eligibility_requirements?: string | null
          eligible_countries?: string[] | null
          essay_required?: boolean | null
          estimated_total_value_usd?: number | null
          extracurricular_required?: boolean | null
          financial_need_required?: boolean | null
          gpa_scale?: number | null
          host_country?: string | null
          how_to_win?: string | null
          ideal_candidate_profile?: string | null
          interview_required?: boolean | null
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
          university_id?: string
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
      [_ in never]: never
    }
    Functions: {
      claim_founding_member_slot: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
