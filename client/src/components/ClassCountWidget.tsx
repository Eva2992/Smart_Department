import React, { useState, useEffect, useContext } from "react";
import { getClassCounts } from "../api/scheduleApi.js";
import { AuthContext } from "../context/authContextDef.js";

interface TeacherClassCount {
  teacherId: string;
  teacherName: string;
  classCount: number;
}

interface CourseClassCount {
  courseId: string;
  courseCode: string;
  courseName: string;
  totalClasses: number;
  teachers: TeacherClassCount[];
}

interface BatchClassCount {
  batchId: string;
  batchName: string;
  courseCode: string;
  classCount: number;
}

interface ClassCountResponse {
  role: "STUDENT" | "CR" | "TEACHER";
  totalConducted?: number;
  totalClassesTaken?: number;
  courses?: CourseClassCount[];
  batches?: BatchClassCount[];
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "response" in err &&
    err.response !== null &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data !== null &&
    typeof err.response.data === "object" &&
    "message" in err.response.data &&
    typeof (err.response.data as Record<string, unknown>).message === "string"
  ) {
    return (err.response.data as Record<string, unknown>).message as string;
  }
  return fallback;
}

export const ClassCountWidget: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [data, setData] = useState<ClassCountResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCounts() {
      setLoading(true);
      setError(null);
      try {
        const res = await getClassCounts();
        setData(res);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Failed to load class counts"));
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadCounts();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs animate-pulse text-xs text-gray-400">
        Loading class tracking metrics...
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const isTeacher = data.role === "TEACHER";

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC143C] bg-rose-50 px-2 py-0.5 rounded-md">
            Class Attendance Tracking
          </span>
          <h3 className="text-base font-bold text-gray-900 mt-1">
            {isTeacher
              ? "Classes Taken by Batch"
              : "Classes Conducted by Course & Teacher"}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 block">Total Completed</span>
          <span className="text-xl font-extrabold text-[#DC143C]">
            {isTeacher ? data.totalClassesTaken || 0 : data.totalConducted || 0}
          </span>
        </div>
      </div>

      {isTeacher ? (
        /* Teacher View (TN-10) */
        data.batches?.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No completed classes recorded yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.batches?.map((b) => (
              <div
                key={`${b.batchId}_${b.courseCode}`}
                className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-gray-900">{b.batchName}</div>
                  <div className="text-[11px] text-gray-500 font-mono">{b.courseCode}</div>
                </div>
                <span className="text-base font-black text-gray-800 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs">
                  {b.classCount}
                </span>
              </div>
            ))}
          </div>
        )
      ) : /* Student View (SN-05) */
      data.courses?.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">
          No completed classes recorded for your batch yet.
        </p>
      ) : (
        <div className="space-y-3">
          {data.courses?.map((course) => (
            <div
              key={course.courseId}
              className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-700">
                    {course.courseCode}
                  </span>
                  <span className="text-xs font-bold text-gray-900">{course.courseName}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-2">
                  {course.teachers?.map((t) => (
                    <span key={t.teacherId} className="inline-flex items-center gap-1">
                      • {t.teacherName}: <strong className="text-gray-800">{t.classCount}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">
                  Course Total
                </span>
                <span className="text-sm font-black text-[#DC143C]">
                  {course.totalClasses} classes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
