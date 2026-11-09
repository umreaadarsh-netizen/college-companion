// 10-point scale commonly used by RGPV-affiliated colleges.
// Check this against your own result sheet and edit here if your college differs.
export const GRADES = [
  { g: 'A+', p: 10 },
  { g: 'A', p: 9 },
  { g: 'B+', p: 8 },
  { g: 'B', p: 7 },
  { g: 'C+', p: 6 },
  { g: 'C', p: 5 },
  { g: 'D', p: 4 },
  { g: 'F', p: 0 },
];

export const gradePoint = (g: string | null) => GRADES.find((x) => x.g === g)?.p ?? null;

// Approximate percentage = CGPA x 10 (commonly used by RGPV). Change if your college uses another formula.
export const PERCENT_FACTOR = 10;
