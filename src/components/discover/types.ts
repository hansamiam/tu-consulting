export interface UniversityContact {
  contact_id: string;
  contact_type: string;
  contact_name: string | null;
  contact_title: string | null;
  email: string | null;
  phone: string | null;
  office_hours: string | null;
  response_time: string | null;
  linkedin_url: string | null;
  whatsapp: string | null;
  telegram: string | null;
  notes: string | null;
}

export interface UniversityInsight {
  insight_id: string;
  employment_rate_6months: number | null;
  average_starting_salary_usd: number | null;
  student_satisfaction_score: number | null;
  international_student_percent: number | null;
  campus_safety_score: number | null;
  housing_available: boolean | null;
  housing_cost_monthly_usd: number | null;
  alumni_network_strength: string | null;
  notable_alumni: string | null;
  student_clubs_count: number | null;
  research_output_score: number | null;
  industry_partnerships: string | null;
  internship_opportunities: string | null;
  post_grad_work_visa: string | null;
  application_tips: string | null;
  common_mistakes: string | null;
}

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
  university_contacts: UniversityContact[];
  university_insights: UniversityInsight[];
}
