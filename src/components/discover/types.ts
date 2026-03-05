export interface UniversityResult {
  university_id: string;
  university_name: string;
  country: string;
  city: string;
  tuition_usd_per_year: number | null;
  cost_of_living_index: number | null;
  language_of_instruction: string | null;
  website_url: string | null;
  foundation_year_available: boolean | null;
  gap_year_accepted: boolean | null;
  programs: {
    program_id: string;
    program_name: string;
    degree_level: string;
    field_of_study: string;
    duration_years: number | null;
    admission_requirements: {
      ielts_required: boolean | null;
      ielts_score_min: number | null;
      sat_required: boolean | null;
      sat_score_min: number | null;
      gpa_min: number | null;
      application_deadline: string | null;
    }[];
    applications: {
      acceptance_rate: number | null;
      visa_difficulty_score: number | null;
      portal_url: string | null;
    }[];
  }[];
  scholarships: {
    scholarship_id: string;
    scholarship_name: string;
    coverage_type: string;
    stipend_amount: number | null;
    eligibility_requirements: string | null;
    application_deadline: string | null;
  }[];
}
