import { roomSize } from './types';

export default function RoomsBadge({ rooms }: { rooms: number | null }) {
  const size = roomSize(rooms);
  if (!size) return null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap tabular-nums ${size.tone}`} title={size.label}>
      {rooms!.toLocaleString()} rooms
    </span>
  );
}
