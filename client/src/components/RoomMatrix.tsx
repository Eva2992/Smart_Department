import { useState, useEffect, useCallback } from "react";
import { getRoomAvailability, type RoomAvailabilityMatrixItem } from "../api/scheduleApi";

export function RoomMatrix() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [matrix, setMatrix] = useState<RoomAvailabilityMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoomAvailability(selectedDate);
      setMatrix(data);
    } catch (err: unknown) {
      console.error("Failed to load room matrix:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🏢 Classroom & Laboratory Availability Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time occupancy and slot availability across the 8 fixed JU CSE department facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Evaluating facility bookings...</p>
        </div>
      ) : matrix.length === 0 ? (
        <div className="p-8 text-center text-slate-400">No facility data found.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-300">
                <th className="py-3 px-4 font-semibold">Facility Room</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                {matrix[0]?.slots.map((s, i) => (
                  <th key={i} className="py-3 px-3 font-semibold text-center whitespace-nowrap">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {matrix.map((item) => (
                <tr key={item.room.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                    {item.room.roomNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {item.room.type}
                  </td>
                  {item.slots.map((slot, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center">
                      {slot.isAvailable ? (
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                          ✓ Free
                        </span>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/70 text-rose-200 text-[10px] leading-tight">
                          <div className="font-bold text-rose-300">
                            {slot.booking?.courseCode || "Booked"}
                          </div>
                          <div className="text-slate-400 truncate max-w-[110px]">
                            {slot.booking?.teacherName}
                          </div>
                          <div className="text-slate-400">{slot.booking?.batchName}</div>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
