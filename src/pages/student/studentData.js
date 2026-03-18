export const STUDENT_PROFILE = {
  name: 'John Doe',
  enrollment: '22CS034',
  department: 'Computer Science',
  year: '2nd Year',
  hostel: 'BSH',
  room: 'B-214',
};

export const STUDENT_CASES = [
  {
    token: '2024-012',
    offenseType: 'Smoking',
    severity: 'Medium',
    severityClass: 'bg-yellow-100 text-yellow-800',
    status: 'Investigation',
    statusDot: 'bg-blue-500',
    dateReported: '12 Feb 2024',
    location: 'Hostel Block B — Stairwell',
    reportedBy: 'Hostel Warden',
    time: '07:40 PM',
    description:
      'Student was found smoking in a non-designated zone near the hostel stairwell during evening rounds. Security staff documented the incident and informed the warden for disciplinary review.',
    evidence: [
      { name: 'Warden_Report.pdf', size: '320 KB', uploadedAt: '12 Feb 2024' },
      { name: 'CCTV_Frame.jpg', size: '860 KB', uploadedAt: '12 Feb 2024' },
    ],
    timeline: [
      { title: 'Case Reported', date: '10 Feb 2024', state: 'completed', note: 'Case #2024-012 reported.' },
      { title: 'Investigation Started', date: '11 Feb 2024', state: 'active', note: 'Investigation initiated by warden office.' },
      { title: 'DAC Review', date: '13 Feb 2024', state: 'upcoming', note: 'DAC hearing scheduled.' },
      { title: 'Resolved', date: null, state: 'upcoming', note: null },
    ],
  },
  {
    token: '2024-009',
    offenseType: 'Attendance',
    severity: 'Low',
    severityClass: 'bg-slate-100 text-slate-700',
    status: 'Resolved',
    statusDot: 'bg-green-500',
    dateReported: '15 Jan 2024',
    location: 'Engineering Block — Lecture Hall 3',
    reportedBy: 'Course Instructor',
    time: '09:15 AM',
    description:
      'Attendance in a core course remained below the minimum policy threshold despite prior reminders. The case was escalated after end-term review.',
    evidence: [{ name: 'Attendance_Sheet.pdf', size: '410 KB', uploadedAt: '15 Jan 2024' }],
    timeline: [
      { title: 'Case Reported', date: '15 Jan 2024', state: 'completed', note: 'Attendance violation submitted.' },
      { title: 'Investigation Started', date: '17 Jan 2024', state: 'completed', note: 'Records validated by department office.' },
      { title: 'DAC Review', date: '24 Jan 2024', state: 'completed', note: 'Committee hearing completed.' },
      { title: 'Resolved', date: '26 Jan 2024', state: 'completed', note: 'Case closed with warning.' },
    ],
    finalDecision: {
      resolvedBy: 'Dr. Amit Sharma',
      role: 'Dean',
      date: '26 Jan 2024',
      fine: '₹ 1,000',
      penaltyPoints: '10 pts',
      actionTaken: 'Written Warning',
      remarks:
        'Student acknowledged attendance violation. Counselling session and attendance monitoring were recommended for the next term.',
    },
  },
  {
    token: '2023-118',
    offenseType: 'Disruption',
    severity: 'Medium',
    severityClass: 'bg-yellow-100 text-yellow-800',
    status: 'Resolved',
    statusDot: 'bg-green-500',
    dateReported: '06 Nov 2023',
    location: 'Central Library — Reading Hall',
    reportedBy: 'Library Supervisor',
    time: '02:35 PM',
    description:
      'Student was involved in disruptive behavior inside the reading hall and ignored repeated staff instructions to maintain discipline.',
    evidence: [
      { name: 'Library_Incident_Report.pdf', size: '270 KB', uploadedAt: '06 Nov 2023' },
      { name: 'Witness_Statement.pdf', size: '190 KB', uploadedAt: '07 Nov 2023' },
    ],
    timeline: [
      { title: 'Case Reported', date: '06 Nov 2023', state: 'completed', note: 'Incident reported by library supervisor.' },
      { title: 'Investigation Started', date: '08 Nov 2023', state: 'completed', note: 'Witness statements collected.' },
      { title: 'DAC Review', date: '15 Nov 2023', state: 'completed', note: 'Case heard by committee.' },
      { title: 'Resolved', date: '18 Nov 2023', state: 'completed', note: 'Fine imposed and case closed.' },
    ],
    finalDecision: {
      resolvedBy: 'Prof. Neeta Joshi',
      role: 'Warden',
      date: '18 Nov 2023',
      fine: '₹ 2,500',
      penaltyPoints: '25 pts',
      actionTaken: 'Community Service (8 hours)',
      remarks:
        'Student accepted responsibility. Community service hours were assigned with a warning for repeat violations.',
    },
  },
];

export const STUDENT_SUMMARY = {
  totalCases: 3,
  activeCases: 1,
  resolvedCases: 2,
  totalPenaltyPoints: 35,
};

export const PENALTY_THRESHOLDS = {
  warning: 50,
  placementBan: 100,
  expulsion: 200,
};

export const STUDENT_RECENT_ACTIVITY = [
  '10 Feb – Case #2024-012 reported',
  '11 Feb – Investigation started',
  '13 Feb – DAC hearing scheduled',
  '15 Feb – Case resolved',
];
