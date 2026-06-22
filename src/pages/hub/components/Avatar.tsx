interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ name, url, size = 7, className = '' }: AvatarProps) {
  const sz = `w-${size} h-${size}`;
  if (url) {
    return <img src={url} alt={name} className={`${sz} rounded-full object-cover object-top flex-shrink-0 ${className}`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="text-white font-bold" style={{ fontSize: size * 1.8 }}>
        {(name[0] ?? '?').toUpperCase()}
      </span>
    </div>
  );
}
