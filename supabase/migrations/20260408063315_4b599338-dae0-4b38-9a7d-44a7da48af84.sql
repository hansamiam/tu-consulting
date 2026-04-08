
-- Add new universities
INSERT INTO public.universities (university_name, country, city, website_url, tuition_usd_per_year, tuition_verified, global_ranking, language_of_instruction, foundation_year_available, gap_year_accepted, cost_of_living_index) VALUES
('University of Toronto', 'Canada', 'Toronto', 'https://www.utoronto.ca', 45000, false, 21, 'English', false, true, 85),
('McGill University', 'Canada', 'Montreal', 'https://www.mcgill.ca', 35000, false, 30, 'English', true, true, 72),
('University of British Columbia', 'Canada', 'Vancouver', 'https://www.ubc.ca', 40000, false, 34, 'English', false, true, 88),
('National University of Singapore', 'Singapore', 'Singapore', 'https://www.nus.edu.sg', 17500, false, 8, 'English', false, false, 90),
('Nanyang Technological University', 'Singapore', 'Singapore', 'https://www.ntu.edu.sg', 17500, false, 15, 'English', false, false, 90),
('University of Hong Kong', 'Hong Kong', 'Hong Kong', 'https://www.hku.hk', 22000, false, 26, 'English', false, true, 92),
('Chinese University of Hong Kong', 'Hong Kong', 'Hong Kong', 'https://www.cuhk.edu.hk', 18000, false, 47, 'English', false, true, 92),
('Trinity College Dublin', 'Ireland', 'Dublin', 'https://www.tcd.ie', 28000, false, 81, 'English', true, true, 80),
('University College Dublin', 'Ireland', 'Dublin', 'https://www.ucd.ie', 25000, false, 126, 'English', true, true, 80),
('University of Auckland', 'New Zealand', 'Auckland', 'https://www.auckland.ac.nz', 28000, false, 68, 'English', true, true, 70),
('University of Otago', 'New Zealand', 'Dunedin', 'https://www.otago.ac.nz', 25000, false, 206, 'English', true, true, 55),
('Politecnico di Milano', 'Italy', 'Milan', 'https://www.polimi.it', 4000, true, 111, 'English', false, false, 78),
('University of Bologna', 'Italy', 'Bologna', 'https://www.unibo.it', 3500, true, 150, 'Italian', false, true, 65),
('Sapienza University of Rome', 'Italy', 'Rome', 'https://www.uniroma1.it', 3000, true, 132, 'Italian', false, true, 70),
('University of Amsterdam', 'Netherlands', 'Amsterdam', 'https://www.uva.nl', 15000, false, 53, 'English', true, true, 85),
('Delft University of Technology', 'Netherlands', 'Delft', 'https://www.tudelft.nl', 14500, false, 47, 'English', false, false, 78),
('Leiden University', 'Netherlands', 'Leiden', 'https://www.universiteitleiden.nl', 14000, false, 77, 'English', false, true, 75),
('University of Copenhagen', 'Denmark', 'Copenhagen', 'https://www.ku.dk', 0, true, 36, 'English', false, true, 95),
('Lund University', 'Sweden', 'Lund', 'https://www.lu.se', 0, true, 85, 'English', false, true, 78),
('Uppsala University', 'Sweden', 'Uppsala', 'https://www.uu.se', 0, true, 105, 'English', false, true, 75),
('University of Oslo', 'Norway', 'Oslo', 'https://www.uio.no', 0, true, 113, 'English', false, true, 100),
('University of Helsinki', 'Finland', 'Helsinki', 'https://www.helsinki.fi', 0, true, 107, 'English', false, true, 82),
('University of Vienna', 'Austria', 'Vienna', 'https://www.univie.ac.at', 1500, true, 137, 'German', true, true, 72),
('Sorbonne University', 'France', 'Paris', 'https://www.sorbonne-universite.fr', 3500, false, 59, 'French', false, true, 90),
('Technical University of Munich', 'Germany', 'Munich', 'https://www.tum.de', 300, true, 37, 'English', false, true, 85),
('Ludwig Maximilian University', 'Germany', 'Munich', 'https://www.lmu.de', 300, true, 54, 'German', false, true, 85),
('University of Navarra', 'Spain', 'Pamplona', 'https://www.unav.edu', 12000, false, 253, 'Spanish', false, true, 60),
('Nazarbayev University', 'Kazakhstan', 'Astana', 'https://nu.edu.kz', 0, true, 350, 'English', true, false, 40),
('University of Tartu', 'Estonia', 'Tartu', 'https://www.ut.ee', 0, true, 285, 'English', true, true, 45),
('Riga Technical University', 'Latvia', 'Riga', 'https://www.rtu.lv', 3500, false, 751, 'English', true, true, 48)
ON CONFLICT DO NOTHING;

-- Add programs for the new universities
INSERT INTO public.programs (university_id, program_name, degree_level, field_of_study, duration_years) 
SELECT u.university_id, p.program_name, p.degree_level, p.field_of_study, p.duration_years
FROM universities u
CROSS JOIN (VALUES
  ('University of Toronto', 'Computer Science', 'bachelor', 'Computer Science', 4),
  ('University of Toronto', 'Engineering Science', 'bachelor', 'Engineering', 4),
  ('University of Toronto', 'Rotman Commerce', 'bachelor', 'Business', 4),
  ('McGill University', 'Arts', 'bachelor', 'Liberal Arts', 3),
  ('McGill University', 'Engineering', 'bachelor', 'Engineering', 4),
  ('University of British Columbia', 'Science', 'bachelor', 'Sciences', 4),
  ('University of British Columbia', 'Computer Science', 'bachelor', 'Computer Science', 4),
  ('National University of Singapore', 'Computing', 'bachelor', 'Computer Science', 4),
  ('National University of Singapore', 'Business Administration', 'bachelor', 'Business', 4),
  ('Nanyang Technological University', 'Engineering', 'bachelor', 'Engineering', 4),
  ('Nanyang Technological University', 'Computer Science', 'bachelor', 'Computer Science', 4),
  ('University of Hong Kong', 'BBA', 'bachelor', 'Business', 4),
  ('University of Hong Kong', 'Engineering', 'bachelor', 'Engineering', 4),
  ('Trinity College Dublin', 'Computer Science', 'bachelor', 'Computer Science', 4),
  ('Trinity College Dublin', 'Business Studies', 'bachelor', 'Business', 4),
  ('University of Auckland', 'Engineering', 'bachelor', 'Engineering', 4),
  ('University of Auckland', 'Commerce', 'bachelor', 'Business', 3),
  ('Politecnico di Milano', 'Architecture', 'bachelor', 'Architecture', 3),
  ('Politecnico di Milano', 'Engineering', 'bachelor', 'Engineering', 3),
  ('University of Amsterdam', 'Economics and Business', 'bachelor', 'Economics', 3),
  ('University of Amsterdam', 'Artificial Intelligence', 'bachelor', 'Computer Science', 3),
  ('Delft University of Technology', 'Aerospace Engineering', 'bachelor', 'Engineering', 3),
  ('Delft University of Technology', 'Computer Science', 'bachelor', 'Computer Science', 3),
  ('University of Copenhagen', 'Computer Science', 'bachelor', 'Computer Science', 3),
  ('University of Copenhagen', 'Economics', 'bachelor', 'Economics', 3),
  ('Technical University of Munich', 'Informatics', 'bachelor', 'Computer Science', 3),
  ('Technical University of Munich', 'Mechanical Engineering', 'bachelor', 'Engineering', 3),
  ('Nazarbayev University', 'Computer Science', 'bachelor', 'Computer Science', 4),
  ('Nazarbayev University', 'Economics', 'bachelor', 'Economics', 4),
  ('Nazarbayev University', 'Engineering', 'bachelor', 'Engineering', 4),
  ('University of Tartu', 'Computer Science', 'bachelor', 'Computer Science', 3),
  ('University of Tartu', 'Software Engineering', 'bachelor', 'Computer Science', 3),
  ('Sorbonne University', 'Mathematics', 'bachelor', 'Mathematics', 3),
  ('Sorbonne University', 'Physics', 'bachelor', 'Sciences', 3),
  ('University of Helsinki', 'Computer Science', 'bachelor', 'Computer Science', 3),
  ('University of Helsinki', 'Data Science', 'master', 'Computer Science', 2),
  ('Lund University', 'Engineering Physics', 'bachelor', 'Engineering', 3),
  ('Lund University', 'Computer Science', 'master', 'Computer Science', 2)
) AS p(uni_name, program_name, degree_level, field_of_study, duration_years)
WHERE u.university_name = p.uni_name;

-- Add scholarships (using only valid coverage_types: full_ride, stipend, tuition_only)
INSERT INTO public.scholarships (university_id, scholarship_name, coverage_type, stipend_amount, eligibility_requirements, verified)
SELECT u.university_id, s.scholarship_name, s.coverage_type, s.stipend_amount, s.eligibility_requirements, s.verified
FROM universities u
CROSS JOIN (VALUES
  ('University of Toronto', 'Lester B. Pearson Scholarship', 'full_ride', NULL, 'Outstanding international students', true),
  ('McGill University', 'Entrance Scholarship', 'tuition_only', NULL, 'High academic achievement', false),
  ('University of British Columbia', 'International Leader of Tomorrow', 'full_ride', NULL, 'Demonstrated leadership and academic excellence', true),
  ('National University of Singapore', 'Global Merit Scholarship', 'full_ride', 6000, 'Top academic performers worldwide', true),
  ('Nanyang Technological University', 'ASEAN Scholarship', 'full_ride', 5000, 'ASEAN country nationals with strong academics', false),
  ('University of Hong Kong', 'HKU Foundation Entrance Scholarship', 'full_ride', NULL, 'Top applicants worldwide', true),
  ('Trinity College Dublin', 'Global Excellence Scholarship', 'tuition_only', NULL, 'Non-EU students with exceptional grades', false),
  ('Politecnico di Milano', 'Merit-Based Scholarship', 'tuition_only', NULL, 'International students with high GPA', false),
  ('University of Amsterdam', 'Amsterdam Excellence Scholarship', 'full_ride', NULL, 'Outstanding non-EU students', true),
  ('Delft University of Technology', 'Justus & Louise van Effen Scholarship', 'full_ride', NULL, 'Excellent MSc candidates', true),
  ('University of Copenhagen', 'Danish Government Scholarship', 'tuition_only', NULL, 'Non-EU students', false),
  ('Technical University of Munich', 'Deutschlandstipendium', 'stipend', 3600, 'Academic excellence', false),
  ('Nazarbayev University', 'NU Full Scholarship', 'full_ride', 2000, 'All admitted students receive full funding', true),
  ('University of Tartu', 'Estonian Government Scholarship', 'full_ride', 4200, 'International students', true),
  ('Lund University', 'Lund University Global Scholarship', 'tuition_only', NULL, 'Non-EU students with strong academics', false),
  ('University of Helsinki', 'Helsinki University Scholarship', 'tuition_only', NULL, 'Non-EU fee-paying students', false)
) AS s(uni_name, scholarship_name, coverage_type, stipend_amount, eligibility_requirements, verified)
WHERE u.university_name = s.uni_name;
