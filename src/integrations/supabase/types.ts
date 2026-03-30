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
          application_deadline: string | null
          coverage_type: string
          created_at: string | null
          eligibility_requirements: string | null
          scholarship_id: string
          scholarship_name: string
          stipend_amount: number | null
          university_id: string
          verified: boolean
        }
        Insert: {
          application_deadline?: string | null
          coverage_type: string
          created_at?: string | null
          eligibility_requirements?: string | null
          scholarship_id?: string
          scholarship_name: string
          stipend_amount?: number | null
          university_id: string
          verified?: boolean
        }
        Update: {
          application_deadline?: string | null
          coverage_type?: string
          created_at?: string | null
          eligibility_requirements?: string | null
          scholarship_id?: string
          scholarship_name?: string
          stipend_amount?: number | null
          university_id?: string
          verified?: boolean
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
