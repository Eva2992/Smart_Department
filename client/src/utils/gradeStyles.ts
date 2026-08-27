/**
 * Determines the CSS badge classes for a numerical GPA.
 */
export function getGpaBadgeClass(gpa: number): string {
  if (gpa >= 3.75) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (gpa >= 2.5) {
    return "bg-slate-100 text-slate-800 border-slate-300";
  }
  if (gpa >= 2.0) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-rose-50 text-rose-700 border-rose-200";
}

/**
 * Determines the CSS badge classes for a letter grade.
 */
export function getGradeBadgeClass(letterGrade: string): string {
  const grade = letterGrade.toUpperCase();
  if (grade === "A+" || grade === "A") {
    return "bg-emerald-100 text-emerald-800 font-bold";
  }
  if (grade === "A-" || grade === "B+" || grade === "B" || grade === "B-") {
    return "bg-blue-100 text-blue-800 font-semibold";
  }
  if (grade === "C+" || grade === "C" || grade === "D") {
    return "bg-amber-100 text-amber-800 font-semibold";
  }
  return "bg-rose-100 text-rose-800 font-bold";
}
