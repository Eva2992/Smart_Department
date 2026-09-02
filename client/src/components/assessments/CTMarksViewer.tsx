import React, { useState, useEffect, useContext } from "react";
import { ctApi } from "../../api/assessments.js";
import { AuthContext } from "../../context/authContextDef.js";
import { Alert } from "../Alert.js";

interface CTMarkItem {
  scheduleEntryId: string;
  ctTitle: string;
  topic: string | null;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  teacherName: string;
  marksObtained: number | null;
  maxMarks: number | null;
  status: "PENDING" | "RECORDED";
  classAverage?: number | null;
  highestMark?: number | null;
  lowestMark?: number | null;
  totalSubmissions?: number;
}

interface CTGroupItem {
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
  totalConducted?: number;
  totalRecorded?: number;
  bestOfThreeSum?: number | null;
  averageScore?: number | null;
  marks: CTMarkItem[];
}

interface CTStudentData {
  student: {
    id: string;
    name: string;
    universityId: string | null;
    batchId: string | null;
    batchName: string | null;
    semesterId: string | null;
    semesterName: string | null;
  };
  groups: CTGroupItem[];
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

export const CTMarksViewer: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [data, setData] = useState<CTStudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetStudentId, setTargetStudentId] = useState(user?.id || "");

  const fetchMarks = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ctApi.getStudentMarks(studentId);
      setData(res.data ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load CT marks"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMarks(user.id);
    }
  }, [user?.id]);

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header & Student Selector for Teachers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC143C] bg-rose-50 px-2 py-0.5 rounded-md">
            Continuous Assessment (FR-27, ADR-0005)
          </span>
          <h2 className="text-xl font-bold text-[#1F2937] mt-1">
            Class Test (CT) Marks &amp; Aggregates
          </h2>
          <p className="text-xs text-gray-500">
            {data?.student
              ? `${data.student.name} • ${data.student.universityId || ""} • ${data.student.batchName || ""}`
              : "View CT performance and Best-3-of-4 calculations"}
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter Student UUID..."
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <button
              type="button"
              onClick={() => fetchMarks(targetStudentId)}
              className="px-3 py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl transition-colors cursor-pointer"
            >
              Lookup
            </button>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div className="text-center py-12 text-xs text-gray-400 animate-pulse">
          Calculating CT marks and class statistics...
        </div>
      ) : !data || !data.groups || data.groups.length === 0 ? (
        <div className="text-center py-12 text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">
          No CT marks recorded yet for this semester.
        </div>
      ) : (
        <div className="space-y-6">
          {data.groups.map((group) => (
            <div
              key={group.courseId || group.courseCode || ""}
              className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden"
            >
              {/* Course Group Header & Best-3-of-4 Summary Card */}
              <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-800">
                      {group.courseCode || "CSE"}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {group.courseName || "Course"}
                    </h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {group.totalConducted || group.marks.length} CTs conducted •{" "}
                    {group.totalRecorded || 0} marks published
                  </p>
                </div>

                {/* Best 3 of 4 Departmental Rule Badge */}
                <div className="flex items-center gap-3">
                  <div className="bg-white px-3.5 py-2 rounded-xl border border-gray-200 text-center shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Best 3 of 4 Total
                    </span>
                    <span className="text-base font-extrabold text-[#DC143C]">
                      {group.bestOfThreeSum !== null && group.bestOfThreeSum !== undefined
                        ? group.bestOfThreeSum
                        : "—"}
                    </span>
                  </div>

                  <div className="bg-white px-3.5 py-2 rounded-xl border border-gray-200 text-center shadow-xs">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Avg Score
                    </span>
                    <span className="text-base font-extrabold text-gray-800">
                      {group.averageScore !== null && group.averageScore !== undefined
                        ? group.averageScore
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CT Marks Table with Class Statistics */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white text-gray-500 font-bold border-b border-gray-100">
                      <th className="py-3 px-4">CT Assessment</th>
                      <th className="py-3 px-4">Date &amp; Room</th>
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4 text-center">My Mark</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Class Statistics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.marks.map((ct) => (
                      <tr key={ct.scheduleEntryId} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{ct.ctTitle}</div>
                          {ct.topic && <div className="text-[11px] text-gray-500">{ct.topic}</div>}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div>{new Date(ct.date).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-400">Room {ct.roomNumber}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{ct.teacherName}</td>
                        <td className="py-3 px-4 text-center">
                          {ct.marksObtained !== null ? (
                            <span className="text-sm font-black text-gray-900">
                              {ct.marksObtained}
                              <span className="text-gray-400 font-normal text-xs">
                                /{ct.maxMarks || 20}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ct.status === "RECORDED" ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Published
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {ct.classAverage !== null && ct.classAverage !== undefined ? (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                Avg: {ct.classAverage}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Max: {ct.highestMark}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                                Min: {ct.lowestMark}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
