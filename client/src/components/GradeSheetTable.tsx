import type { CourseMark } from "../types/result.js";
import { getGpaBadgeClass, getGradeBadgeClass } from "../utils/gradeStyles.js";

interface GradeSheetTableProps {
  studentName?: string;
  universityId: string;
  courseMarks: CourseMark[];
  gpa: number;
  cgpa?: number;
  semesterName?: string;
  batchName?: string;
}

export function GradeSheetTable({
  studentName,
  universityId,
  courseMarks,
  gpa,
  cgpa,
  semesterName,
  batchName,
}: GradeSheetTableProps) {
  const totalCredits = courseMarks.reduce((acc, c) => acc + (c.creditHours || 0), 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 mb-6 transition-all hover:shadow-md">
      {/* Student & Semester Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 font-['Poppins']">
              {studentName || `Student ${universityId}`}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              Roll: {universityId}
            </span>
          </div>
          {(semesterName || batchName) && (
            <p className="text-xs text-gray-500 mt-1 font-['Inter']">
              {batchName ? `Batch ${batchName}` : ""}
              {batchName && semesterName ? " • " : ""}
              {semesterName}
            </p>
          )}
        </div>

        {/* GPA Summary Badges */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[90px] ${getGpaBadgeClass(
              gpa
            )}`}
          >
            <span className="text-[10px] uppercase font-semibold tracking-wider opacity-80">
              Semester GPA
            </span>
            <span className="text-xl font-extrabold font-['Poppins']">{gpa.toFixed(2)}</span>
          </div>

          {cgpa !== undefined && (
            <div className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 flex flex-col items-center justify-center min-w-[90px]">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">
                CGPA
              </span>
              <span className="text-xl font-bold font-['Poppins'] text-gray-900">
                {cgpa.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Course Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-['Inter']">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="py-3 px-4 font-semibold rounded-l-lg">Course Code</th>
              <th className="py-3 px-4 font-semibold">Course Title</th>
              <th className="py-3 px-4 font-semibold text-center">Credit Hours</th>
              <th className="py-3 px-4 font-semibold text-center">Marks</th>
              <th className="py-3 px-4 font-semibold text-center">Letter Grade</th>
              <th className="py-3 px-4 font-semibold text-right rounded-r-lg">Grade Point</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {courseMarks.map((course, idx) => (
              <tr
                key={`${course.courseCode}-${idx}`}
                className="hover:bg-gray-50/60 transition-colors"
              >
                <td className="py-3 px-4 font-semibold text-gray-900">{course.courseCode}</td>
                <td className="py-3 px-4">{course.courseTitle}</td>
                <td className="py-3 px-4 text-center">{course.creditHours.toFixed(1)}</td>
                <td className="py-3 px-4 text-center font-medium">
                  {course.marks !== undefined ? course.marks : "—"}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${getGradeBadgeClass(
                      course.letterGrade
                    )}`}
                  >
                    {course.letterGrade}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-900 font-['Poppins']">
                  {course.gradePoint.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/80 font-semibold text-gray-800 text-xs border-t border-gray-200">
              <td colSpan={2} className="py-3 px-4">
                Total Credit Hours Completed
              </td>
              <td className="py-3 px-4 text-center text-indigo-700 font-bold font-['Poppins']">
                {totalCredits.toFixed(1)}
              </td>
              <td colSpan={2} className="py-3 px-4 text-right">
                Term GPA
              </td>
              <td className="py-3 px-4 text-right font-bold text-base text-gray-900 font-['Poppins']">
                {gpa.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
