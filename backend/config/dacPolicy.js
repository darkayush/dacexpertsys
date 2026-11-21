// Official BMU disciplinary policies, transcribed from the signed PDFs:
//  - Disciplinary Action Policy (Version 02), BMU/RO/2025/0051, dated 19 February 2025
//  - Unfair Means Policy, BMU/RO/UFM/2018/0222, dated 23 July 2018
// Served to the student "DAC Policy" page and used to load the admin Rules list.
// Keep this file in sync with the PDFs if the university issues a new version.

export const DAC_POLICY = {
  title: 'Disciplinary Action Policy',
  version: '2.0',
  reference: 'BMU/RO/2025/0051',
  date: '2025-02-19',
  approver: 'Vice Chancellor',
  intro:
    'Discipline plays a vital role in shaping character and ensuring the smooth functioning of the University. '
    + 'BML Munjal University expects its students to uphold high standards of discipline and decorum at all times. '
    + 'The Disciplinary Action Committee, after dealing with each case, shall recommend penalties in accordance with '
    + 'the nature of the offence as prescribed below. The list of offences and penalties is indicative; for any offence '
    + 'or penalty not covered, the Committee may recommend a penalty depending on the gravity of the offence.',
  levels: [
    {
      level: 1,
      fine: 1000,
      points: 10,
      offences: [
        'Missing a compulsory guest lecture or event',
        'Entering campus after use of intoxicants such as alcohol',
        'Leaving campus without permission',
        'Arriving late at the campus at night',
      ],
    },
    {
      level: 2,
      fine: 2500,
      points: 25,
      offences: [
        'Possession or consumption of cigarettes, liquor or any intoxicants on campus',
        'Stirring communal, caste or religious sentiments that lead to discord among students',
        'Creating disturbance or nuisance in hostel/University',
        'Use of derogatory slogans in the University premises',
      ],
    },
    {
      level: 3,
      fine: 5000,
      points: 50,
      offences: [
        'Misbehaviour with support or security staff and faculty',
        'Cyber offence',
        'Gambling',
        'Stealing',
        'Wilful abuse or damage of university property',
        'Indulging in fights and brawls',
        'Endangering life and property',
        'False activation of fire alarms',
      ],
    },
    {
      level: 4,
      fine: 10000,
      points: 100,
      offences: [
        'Violent physical assault',
        'Serious cyber offence',
        'Maligning the name of the University',
        'Committing forgery, tampering or misuse of university documents/records',
        'Any offence under law',
        'Any activity bringing disrepute to BMU',
      ],
    },
  ],
  thresholds: [
    { points: 100, consequence: 'Barred from placement (points accumulated during the entire stay at BMU).' },
    { points: 200, consequence: 'Expelled from the University (at any time during the tenure of study).' },
  ],
  rules: [
    'Students can violate discipline in an infinite number of ways, so not all instances can be listed. The Committee can recommend penalties based on the gravity of the offence.',
    'Depending on the nature of indiscipline and misconduct, penalties mentioned in the First Ordinance of the University, or a combination thereof including police complaints, may also be awarded.',
    'Paying the fine does not cancel the penalty points. The fine is over and above the penalty points levied.',
    'A student who accumulates 100 penalty points during the entire stay at BMU is barred from placement.',
    'A student will be expelled from the University upon accumulating 200 penalty points at any time during their tenure of study.',
    'All cases of indiscipline shall be reported to the Office of the Dean, Student Welfare promptly. For hostel cases, the Warden forwards the case through the Chief Warden to the Dean, Student Welfare after initial investigation (within 2 days of the case being reported). The Office of the Dean, Student Welfare investigates and shares the report with the Dean of the School (within 3 days of receiving the case). The Dean of the School recommends whether the case goes to the DAC Committee.',
    'On receipt of a case from the Office of the Dean, Student Welfare, the Member Secretary, DAC allocates a unique number to every complaint. DAC meetings are convened on the advice of the Chairperson, DAC.',
    'For complaints under all levels, DAC shall issue a Show Cause Notice, conduct an enquiry, afford a personal hearing to the student, and thereafter take the decision.',
    'The scholarship will not be revoked for students awarded a Level 1 penalty for the first time.',
    'The final decision is sent to the Program Office, the Dean of the School and the Office of the Registrar after approval of the Vice Chancellor.',
    'The Program Office communicates the decision to the student and parent/local guardian and sends a copy to the student\'s mentor.',
    'Records of penalty points are maintained by the respective Program Offices and the Office of the Registrar.',
    'Fines must be paid within a week of the decision being communicated by the Program Office, and the payment receipt produced. If the fine is not deposited within a week, the Chairperson, DAC may increase it; the Program Office will inform the Member Secretary, DAC.',
    'Students may appeal against fines and penalty points by writing to appeal.dac@bml.edu.in after paying an appeal fee of Rs. 500, within a week of the decision being communicated. The Appellate Committee decides after a hearing in person. If the appeal is upheld, the appeal fee is refunded and the fine/penalty points are adjusted. The appeal is considered only after the fine and appeal fee are paid; if it is turned down, the appeal fee is forfeited.',
    'DAC reserves the right to punish repeat offenders to a greater extent.',
  ],
  committees: {
    dac: {
      members: [
        'Any Officer of the University: Chairman',
        'Four Faculty: Members',
        'One student from each school (at least 1 male and 1 female student): Members',
        'Assistant Registrar: Member Secretary',
      ],
      quorum: 4,
      nominatedBy: 'Vice Chancellor',
    },
    appellate: {
      members: [
        'Vice Chancellor/Pro-Vice Chancellor: Chairperson',
        'Dean of each School: Members',
        'Registrar: Member',
        'Two Faculty members: Members',
        'Deputy Registrar: Convener',
      ],
      quorum: 3,
      nominatedBy: 'President',
      note: 'No member of DAC will form part of the Appellate Committee.',
    },
  },
};

export const UNFAIR_MEANS_POLICY = {
  title: 'Unfair Means Policy',
  reference: 'BMU/RO/UFM/2018/0222',
  date: '2018-07-23',
  intro:
    'During examinations, candidates are under the disciplinary control of the Examination Centre Superintendent. '
    + 'Cases of unfair means or disorderly conduct are reported to the Controller of Examinations, who refers them to the '
    + 'Unfair Means Committee. The Committee recommends penalties to the Vice Chancellor. The penalty table is indicative; '
    + 'for offences not listed, the Committee may recommend a penalty depending on the gravity of the offence.',
  categories: [
    {
      category: 1,
      dacLevel: null,
      punishment: 'The first answer-book may be cancelled and only the second evaluated, or both may be cancelled and an F grade awarded, depending on the gravity of the offence.',
      offences: [
        'Talking with another student in the examination hall',
        'Talking to a person outside the examination hall before submitting the answer sheet (e.g. while going to the washroom)',
        'Deliberately changing seat in the examination hall without the invigilator\'s permission',
        'Appealing to the examiner in the answer-book',
        'Deliberately disclosing identity by making a distinctive mark in the answer book',
        'Trying to get or appealing to the invigilator for help during the examination',
      ],
    },
    {
      category: 2,
      dacLevel: 'I',
      punishment: 'Cancellation of the exam for the course and award of F grade. DAC Level I.',
      offences: [
        'Writing solutions to the questions on the question paper or an electronic device during the examination',
        'Possessing a cell phone, smart watch or other communication gadget in the examination hall',
        'Possessing unauthorised material (printed papers, books, notes on clothes, body, desk or instruments) that could help, but not used as per the invigilator',
        'Possessing a solution to a question set in the question paper',
        'Difference in handwriting in the answer script',
      ],
    },
    {
      category: 3,
      dacLevel: 'II',
      punishment: 'Cancellation of the exam for the course and award of R grade in that course. DAC Level II.',
      offences: [
        'Copying or attempting to copy from objectionable material in one\'s possession',
        'Copying or attempting to copy from another candidate',
        'Assisting another candidate to copy',
        'Receiving or attempting to receive help for answering the question paper from any source, inside or outside the hall',
        'Swallowing, running away with, destroying or causing disappearance of a note or paper',
        'Passing or attempting to pass a copy of the question paper, a question, or a solution to anyone',
        'Use of mobile, smart watch or other electronic communication inside the examination hall',
        'Communicating or trying to communicate with any person in a manner indicative of help being sought or given',
        'Leaving the examination hall without handing over the answer book, or taking away, tearing or disposing of it',
        'Misbehaving with the Superintendent, supervisory staff, inspection team, flying squad or another candidate',
        'Creating disturbance in the examination hall or its vicinity',
      ],
    },
    {
      category: 4,
      dacLevel: 'III/IV',
      punishment: 'All examinations of that term cancelled and R grade awarded in all courses registered for the term. DAC Level III/IV. In addition, the student may be debarred from University examinations for one or more terms, or expelled, depending on the gravity of the offence.',
      offences: [
        'Previous arrangement to obtain help through any student, staff or other agency in connection with the question paper',
        'Smuggling an answer booklet or continuation sheet in or out of the place of examination',
        'Replacing or getting replaced answer books, leaves or continuation sheets during or after the examination',
        'Interfering with or counterfeiting the University seal, answer books or examination stationery',
        'Communicating or attempting to communicate with an examiner to influence the award of marks',
        'Deliberately writing another student\'s roll number in one\'s answer book',
        'Using abusive or obscene language in the answer book',
        'Coming to the examination hall under the influence of alcoholic drink or drugs',
      ],
    },
    {
      category: 5,
      dacLevel: null,
      punishment: 'Expulsion from the University.',
      offences: [
        'Getting oneself impersonated, or impersonating another candidate',
        'Organising or instigating a walk-out, or misconducting oneself in or outside the examination hall',
        'Carrying firearms or any other weapon into the examination hall',
      ],
    },
  ],
  additional: [
    'Every student found guilty of unfair means or disorderly conduct in examinations must complete an online course on plagiarism. Without the completion certificate shown to the Head of School, the degree will be withheld.',
    'For a repeat offence, a higher level of penalty will be awarded.',
    'Unfair means or plagiarism in class work (quizzes, reports, dissertations, practicals, projects) is handled by the committee nominated by the Dean of the School; serious cases go to the University Unfair Means Committee.',
    'Plagiarism, minor offence (poor referencing rather than intent to deceive): reprimand, reduced or capped marks, zero marks for the submission, or DAC Level I.',
    'Plagiarism, major offence (large copied sections, using another student\'s work, or a third minor offence): marks set to zero or capped, re-submission with fee, zero in all subjects and dropping a year, or expulsion in the most serious cases; DAC Level III.',
    'A student may appeal to the Vice Chancellor within 5 days of receiving the decision.',
  ],
};

// Offence types shown in the Register Case "Offense Type" dropdown, in this order. Each rule in
// Admin Settings → Rules & Policies belongs to one type (rules.offence_type); picking a type on
// Register Case lists that type's rules. "Other" has no rules: the warden types the offence.
export const OFFENCE_TYPES = [
  'Substance Abuse',
  'Attendance & Curfew',
  'Disruption & Conduct',
  'Harassment & Violence',
  'Property Damage & Theft',
  'Cyber Offence',
  'Serious Misconduct',
  'Exam Malpractice',
  'Plagiarism',
  'Other',
];

// Offence type of each DAC Policy v2 offence (exam and plagiarism rules get their type below).
const DAC_OFFENCE_TYPE = {
  'Missing a compulsory guest lecture or event': 'Attendance & Curfew',
  'Entering campus after use of intoxicants such as alcohol': 'Substance Abuse',
  'Leaving campus without permission': 'Attendance & Curfew',
  'Arriving late at the campus at night': 'Attendance & Curfew',
  'Possession or consumption of cigarettes, liquor or any intoxicants on campus': 'Substance Abuse',
  'Stirring communal, caste or religious sentiments that lead to discord among students': 'Disruption & Conduct',
  'Creating disturbance or nuisance in hostel/University': 'Disruption & Conduct',
  'Use of derogatory slogans in the University premises': 'Disruption & Conduct',
  'Misbehaviour with support or security staff and faculty': 'Harassment & Violence',
  'Cyber offence': 'Cyber Offence',
  Gambling: 'Disruption & Conduct',
  Stealing: 'Property Damage & Theft',
  'Wilful abuse or damage of university property': 'Property Damage & Theft',
  'Indulging in fights and brawls': 'Harassment & Violence',
  'Endangering life and property': 'Harassment & Violence',
  'False activation of fire alarms': 'Disruption & Conduct',
  'Violent physical assault': 'Harassment & Violence',
  'Serious cyber offence': 'Cyber Offence',
  'Maligning the name of the University': 'Serious Misconduct',
  'Committing forgery, tampering or misuse of university documents/records': 'Serious Misconduct',
  'Any offence under law': 'Serious Misconduct',
  'Any activity bringing disrepute to BMU': 'Serious Misconduct',
};

// Older offence type names (still in seed data and cases registered before the types were
// linked to the rules) and their current names. Bootstrap relabels existing cases on start.
export const OFFENCE_TYPE_RENAMES = {
  Attendance: 'Attendance & Curfew',
  Disruption: 'Disruption & Conduct',
  Harassment: 'Harassment & Violence',
  Vandalism: 'Property Damage & Theft',
};

// Penalty points for the DAC level named in the Unfair Means Policy. Category 4 says "DAC Level III/IV";
// the rules list uses Level III (50) as the minimum, and the Committee may award Level IV (100).
const UFM_LEVEL_POINTS = { I: 10, II: 25, 'III/IV': 50 };

/**
 * DAC level (1-4) of a rule from its category: "Level 3" -> 3, "Exam Cat. 3 (DAC Level II)" -> 2,
 * "Plagiarism (DAC Level III)" -> 3. "III/IV" -> 3 (the minimum, matching the rule's points).
 * Returns null when the category names no level.
 */
export function levelFromCategory(category) {
  const text = String(category || '');
  const plain = /^Level\s+([1-4])\b/i.exec(text);
  if (plain) return Number(plain[1]);
  const roman = /DAC Level\s+(III|II|IV|I)\b/i.exec(text);
  return roman ? { I: 1, II: 2, III: 3, IV: 4 }[roman[1].toUpperCase()] : null;
}

/**
 * Admin Rules list, built from both PDFs. weight = penalty points.
 *  - DAC Policy v2: every offence, category "Level N".
 *  - Unfair Means Policy: exam offences in Categories 2-4 (the ones mapped to a DAC level),
 *    category "Exam Cat. N (DAC Level X)". Category 1 (grade penalty only) and Category 5
 *    (expulsion) carry no DAC level, so they are not point rules.
 *  - Plagiarism: minor = DAC Level I, major = DAC Level III.
 * offence_type = the Register Case offence type (OFFENCE_TYPES) the rule is listed under.
 */
export function getDacPolicyRules() {
  const dacRules = DAC_POLICY.levels.flatMap((level) => level.offences.map((offence) => ({
    question: offence,
    weight: level.points,
    category: `Level ${level.level}`,
    offence_type: DAC_OFFENCE_TYPE[offence] || 'Other',
  })));

  const examRules = UNFAIR_MEANS_POLICY.categories
    .filter((c) => UFM_LEVEL_POINTS[c.dacLevel])
    .flatMap((c) => c.offences.map((offence) => ({
      question: `Exam: ${offence}`,
      weight: UFM_LEVEL_POINTS[c.dacLevel],
      category: `Exam Cat. ${c.category} (DAC Level ${c.dacLevel})`,
      offence_type: 'Exam Malpractice',
    })));

  const plagiarismRules = [
    { question: 'Plagiarism: minor offence (poor referencing, not an intent to deceive)', weight: 10, category: 'Plagiarism (DAC Level I)', offence_type: 'Plagiarism' },
    { question: 'Plagiarism: major offence (large copied sections, another student\'s work, or third minor offence)', weight: 50, category: 'Plagiarism (DAC Level III)', offence_type: 'Plagiarism' },
  ];

  return [...dacRules, ...examRules, ...plagiarismRules];
}
