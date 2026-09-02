import { useState, useEffect } from "react";
import { getRoomScheduleGrid, getRoomAvailability, type RoomScheduleGrid, type RoomScheduleSlot } from "../api/scheduleApi";

function getRoomTypeBadge(type: string) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    CLASSROOM: { label: 'Classroom', color: '#1F2937', bg: '#F3F4F6' },
    COMPUTER_LAB: { label: 'Computer Lab', color: '#DC143C', bg: '#FEF2F2' },
    ELECTRICAL_LAB: { label: 'Electrical Lab', color: '#F59E0B', bg: '#FFFBEB' },
    MULTIPURPOSE: { label: 'Multipurpose', color: '#DA532C', bg: '#FFF7ED' },
  };
  const { label, color, bg } = config[type] || config.CLASSROOM;
  return (
    <span
      style={{ backgroundColor: bg, color: color, borderColor: color }}
      className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-medium border border-opacity-20"
    >
      {label}
    </span>
  );
}

function getStartOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day; // adjust when day is sunday
  return new Date(date.setDate(diff));
}

function addDays(d: Date, days: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export function RoomMatrix() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatDate(new Date()));
  const [gridData, setGridData] = useState<RoomScheduleGrid | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive dates
  const weekDates = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i));
  const weekDatesStr = weekDates.map(formatDate);
  const startDateStr = weekDatesStr[0];
  const endDateStr = weekDatesStr[4];

  // Make sure selected date is valid in week bounds, default to sunday if not
  const activeDateStr = weekDatesStr.includes(selectedDateStr) ? selectedDateStr : weekDatesStr[0];

  useEffect(() => {
    let isMounted = true;
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const data = await getRoomScheduleGrid(startDateStr, endDateStr);
        if (isMounted) {
          setGridData(data);
        }
      } catch (err: unknown) {
        console.error("Failed to load room matrix grid, falling back:", err);
        // Fallback
        try {
          const fbData = await getRoomAvailability(activeDateStr);
          if (isMounted && fbData.length) {
            const roomGrid: Record<string, Record<string, RoomScheduleSlot[]>> = {};
            fbData.forEach(item => {
              roomGrid[item.room.id] = {
                [activeDateStr]: item.slots.map(s => ({
                  ...s,
                  booking: s.booking ? { ...s.booking, type: s.booking.type || "CLASS" } : null
                }))
              };
            });
            const fakeGrid: RoomScheduleGrid = {
              rooms: fbData.map(f => f.room),
              dates: [activeDateStr],
              grid: roomGrid
            };
            setGridData(fakeGrid);
          }
        } catch (fallbackErr) {
          console.error(fallbackErr);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMatrix();
    return () => {
      isMounted = false;
    };
  }, [startDateStr, endDateStr, activeDateStr]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
    setSelectedDateStr(formatDate(addDays(currentWeekStart, -7)));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
    setSelectedDateStr(formatDate(addDays(currentWeekStart, 7)));
  };

  // Backend grid structure: grid[roomId][dateStr] = slots[]
  const getRoomSlots = (roomId: string) => gridData?.grid[roomId]?.[activeDateStr] || [];
  const activeRooms = gridData?.rooms || [];

  return (
    <div className="bg-[#FFFFFF] border border-gray-100 rounded-2xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
            <span>🏢 Classroom &amp; Laboratory Availability Matrix</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time occupancy and slot availability across facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-md hover:bg-gray-50">
            ◀ Prev Week
          </button>
          <button onClick={handleNextWeek} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-md hover:bg-gray-50">
            Next Week ▶
          </button>
        </div>
      </div>

      <div className="flex gap-2 py-4 overflow-x-auto">
        {weekDates.map(date => {
          const ds = formatDate(date);
          const isSelected = ds === activeDateStr;
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = date.getDate();
          return (
            <button
              key={ds}
              onClick={() => setSelectedDateStr(ds)}
              className={`flex flex-col items-center min-w-[60px] px-3 py-2 rounded-xl border transition-all ${
                isSelected 
                  ? "border-[#DC143C] bg-red-50 text-[#DC143C] shadow-sm"
                  : "border-gray-200 bg-white text-[#6B7280] hover:bg-gray-50"
              }`}
            >
              <span className={`text-xs font-bold ${isSelected ? "text-[#DC143C]" : "text-[#1F2937]"}`}>{dayName}</span>
              <span className="text-lg font-bold">{dayNum}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#6B7280]">
          <div className="w-8 h-8 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-medium">Evaluating facility bookings...</p>
        </div>
      ) : activeRooms.length === 0 ? (
        <div className="p-8 text-center text-[#6B7280] text-xs">No facility data found for this week.</div>
      ) : (
        <div className="mt-4 overflow-x-auto pb-4">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[#1F2937]">
                <th className="py-3 px-4 font-bold font-[Poppins]">Facility Room</th>
                {(activeRooms[0] ? getRoomSlots(activeRooms[0].id) : []).map((s, i) => (
                  <th key={i} className="py-3 px-3 font-bold text-center whitespace-nowrap font-[Inter]">
                    {s.label}
                  </th>
                )) || <th className="py-3 px-3">No Slots</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeRooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-[#1F2937] font-[Poppins]">{room.roomNumber}</div>
                    {getRoomTypeBadge(room.type)}
                  </td>
                  {getRoomSlots(room.id).map((slot, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center align-top min-w-[120px]">
                      {slot.isAvailable ? (
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F3F4F6] text-[#16A34A] border border-emerald-200">
                          ✓ Free
                        </span>
                      ) : (
                        renderSlotBooking(slot.booking)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-[#1F2937]">Legend:</span>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#16A34A]"></span> <span className="text-[#6B7280]">Free</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#1F2937]"></span> <span className="text-[#6B7280]">Class</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#DA532C]"></span> <span className="text-[#6B7280]">CT</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#DC143C]"></span> <span className="text-[#6B7280]">Exam</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span> <span className="text-[#6B7280]">Seminar</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderSlotBooking(booking: RoomScheduleSlot["booking"]) {
  if (!booking) return null;
  const type = booking.type || "CLASS";
  const { courseCode, teacherName, batchName, title } = booking;
  
  if (type === "CT") {
    return (
      <div className="p-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[10px] leading-tight text-left">
        <div className="font-bold text-[#DA532C]">CT: {courseCode}</div>
        <div className="text-[#6B7280] truncate">{teacherName}</div>
        <div className="text-[#6B7280] truncate">{batchName}</div>
      </div>
    );
  }
  if (type === "EXAM") {
    return (
      <div className="p-1.5 rounded-xl bg-red-50 border border-red-200 text-[10px] leading-tight text-left">
        <div className="font-bold text-[#DC143C]">EXAM: {courseCode}</div>
        <div className="text-[#6B7280] truncate">{teacherName}</div>
        <div className="text-[#6B7280] truncate">{batchName}</div>
      </div>
    );
  }
  if (type === "SEMINAR") {
    return (
      <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] leading-tight text-left">
        <div className="font-bold text-[#F59E0B]">Seminar: {title || courseCode}</div>
        <div className="text-[#6B7280] truncate">{teacherName}</div>
        <div className="text-[#6B7280] truncate">{batchName}</div>
      </div>
    );
  }
  // Default CLASS
  return (
    <div className="p-1.5 rounded-xl bg-[#F3F4F6] border border-gray-200 text-[10px] leading-tight text-left">
      <div className="font-bold text-[#1F2937]">{courseCode || "Class"}</div>
      <div className="text-[#6B7280] truncate">{teacherName}</div>
      <div className="text-[#6B7280] truncate">{batchName}</div>
    </div>
  );
}
