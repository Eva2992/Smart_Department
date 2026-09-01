import { useState, useEffect } from "react";
import { getRooms } from "../api/scheduleApi";

interface RoomSelectorProps {
  value: string;
  onChange: (roomId: string) => void;
  rooms?: Array<{ id: string; roomNumber: string; type: string; description?: string }>;
  disabled?: boolean;
  className?: string;
}

export function RoomSelector({ value, onChange, rooms: externalRooms, disabled, className = "" }: RoomSelectorProps) {
  const [internalRooms, setInternalRooms] = useState<Array<{ id: string; roomNumber: string; type: string; description?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!externalRooms) {
      setLoading(true);
      getRooms()
        .then(data => setInternalRooms(data))
        .catch(err => console.error("Failed to load rooms:", err))
        .finally(() => setLoading(false));
    }
  }, [externalRooms]);

  const rooms = externalRooms || internalRooms;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CLASSROOM': return '#1F2937';
      case 'COMPUTER_LAB': return '#DC143C';
      case 'ELECTRICAL_LAB': return '#F59E0B';
      case 'MULTIPURPOSE': return '#DA532C';
      default: return '#1F2937';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-[#1F2937] font-[Inter] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] disabled:opacity-50 appearance-none pr-8"
      >
        <option value="" disabled>Select a room</option>
        {rooms.map(room => (
          <option key={room.id} value={room.id}>
            {room.roomNumber} ({room.type.replace('_', ' ')})
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      
      {/* Visual badge for selected room if valid */}
      {value && rooms.find(r => r.id === value) && (
        <div 
          className="absolute right-8 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: getTypeColor(rooms.find(r => r.id === value)!.type) }}
        ></div>
      )}
    </div>
  );
}
