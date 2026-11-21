// "Recently viewed" cases and students for the staff dashboard. Recorded when a case or a
// student profile is opened, kept per signed-in user in this browser (localStorage) only.
// It is a convenience list: storage can be unavailable (private mode, blocked site data), in
// which case nothing is recorded and the panel shows its empty state.

const LIMIT = 8;
const storageKey = (userId) => `dac.recentlyViewed.${userId}`;

export function getRecentlyViewed(userId) {
  const empty = { cases: [], students: [] };
  if (!userId) return empty;
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null');
    return {
      cases: Array.isArray(parsed?.cases) ? parsed.cases : [],
      students: Array.isArray(parsed?.students) ? parsed.students : [],
    };
  } catch {
    return empty;
  }
}

function record(userId, list, entry, sameAs) {
  if (!userId) return;
  try {
    const current = getRecentlyViewed(userId);
    const next = {
      ...current,
      [list]: [{ ...entry, viewedAt: Date.now() }, ...current[list].filter((item) => !sameAs(item))].slice(0, LIMIT),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // Storage full or blocked: skip recording.
  }
}

export function recordCaseView(userId, caseItem) {
  if (!caseItem?.id) return;
  record(userId, 'cases', {
    id: caseItem.id,
    caseId: caseItem.external_case_id || `#${caseItem.id}`,
    student: caseItem.student_name || '',
    offense: caseItem.offense_type || '',
  }, (item) => item.id === caseItem.id);
}

export function recordStudentView(userId, student) {
  if (!student?.enrollment_no) return;
  const enrollment = String(student.enrollment_no);
  record(userId, 'students', {
    enrollment,
    name: student.name || '',
    program: student.program || '',
  }, (item) => item.enrollment === enrollment);
}
