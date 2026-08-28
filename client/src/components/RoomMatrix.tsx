import { useState, useEffect, useCallback } from "react";
import { getRoomAvailability, type RoomAvailabilityMatrixItem } from "../api/scheduleApi";

export function RoomMatrix() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
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
    <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
            <span>🏢 Classroom &amp; Laboratory Availability Matrix</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time occupancy and slot availability across the 8 fixed JU CSE department
            facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#1F2937]">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#6B7280]">
          <div className="w-8 h-8 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-medium">Evaluating facility bookings...</p>
        </div>
      ) : matrix.length === 0 ? (
        <div className="p-8 text-center text-[#6B7280] text-xs">No facility data found.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[#1F2937]">
                <th className="py-3 px-4 font-bold">Facility Room</th>
                <th className="py-3 px-4 font-bold">Type</th>
                {matrix[0]?.slots.map((s, i) => (
                  <th key={i} className="py-3 px-3 font-bold text-center whitespace-nowrap">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matrix.map((item) => (
                <tr key={item.room.id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4 font-bold text-[#DC143C] whitespace-nowrap">
                    {item.room.roomNumber}
                  </td>
                  <td className="py-3 px-4 text-[#6B7280] text-[11px] whitespace-nowrap">
                    {item.room.type}
                  </td>
                  {item.slots.map((slot, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center">
                      {slot.isAvailable ? (
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                          ✓ Free
                        </span>
                      ) : (
                        <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[10px] leading-tight shadow-2xs">
                          <div className="font-bold text-[#E11D48]">
                            {slot.booking?.courseCode || "Booked"}
                          </div>
                          <div className="text-[#6B7280] truncate max-w-[110px]">
                            {slot.booking?.teacherName}
                          </div>
                          <div className="text-[#6B7280]">{slot.booking?.batchName}</div>
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
