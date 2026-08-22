import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  hasPhoto: boolean;
}

const VISIBLE_COUNT = 4;
const CHANGE_INTERVAL_MS = 4000;

export default function AboutTeaser() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [visible, setVisible] = useState<number[]>([0, 1, 2, 3]);
  const [slotFade, setSlotFade] = useState<boolean[]>([true, true, true, true]);
  const cursorRef = useRef(VISIBLE_COUNT);
  const slotTurnRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.functions.invoke('public-team');
      const mapped: TeamMember[] = (data?.team ?? [])
        .filter((m: any) => !String(m.full_name || '').toLowerCase().includes('reeva'))
        .filter((m: any) => !String(m.full_name || '').toLowerCase().includes('dan'))
        .map((m: any) => ({
          name: m.full_name,
          role: m.job_title || m.department || '',
          image: m.avatar_url || '',
          hasPhoto: !!m.avatar_url,
        }));
      setTeamMembers(mapped);
      const initial = Array.from({ length: VISIBLE_COUNT }, (_, i) => i % Math.max(mapped.length, 1));
      setVisible(initial);
      cursorRef.current = Math.min(VISIBLE_COUNT, mapped.length) % Math.max(mapped.length, 1);
      slotTurnRef.current = 0;
    })();
  }, []);

  // Exactly one slot changes at a time, on a single shared timer, and the
  // replacement always skips any teammate already showing in another slot —
  // so changes never overlap and no one appears twice at once.
  useEffect(() => {
    if (teamMembers.length <= VISIBLE_COUNT) return;

    const interval = setInterval(() => {
      const slot = slotTurnRef.current % VISIBLE_COUNT;
      slotTurnRef.current += 1;

      setSlotFade((prev) => {
        const next = [...prev];
        next[slot] = false;
        return next;
      });

      setTimeout(() => {
        setVisible((prev) => {
          // Must exclude every currently-visible member, including whoever
          // is already in this slot — otherwise the pick can land back on
          // the same person, and the slot fades out then back into the
          // exact same photo (reads as a glitch, not a rotation).
          let candidate = cursorRef.current;
          while (prev.includes(candidate)) {
            candidate = (candidate + 1) % teamMembers.length;
          }
          cursorRef.current = (candidate + 1) % teamMembers.length;
          const next = [...prev];
          next[slot] = candidate;
          return next;
        });
        setSlotFade((prev) => {
          const next = [...prev];
          next[slot] = true;
          return next;
        });
      }, 350);
    }, CHANGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [teamMembers.length]);

  const visibleMembers = visible
    .slice(0, Math.min(VISIBLE_COUNT, teamMembers.length))
    .map((idx) => teamMembers[idx % teamMembers.length]);

  return (
    <section className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D] mb-4">
          Who We Are
        </p>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight max-w-2xl">
            <span className="text-[#303236]">
              We&apos;re a Cebuano creative firm that believes thoughtful design leads to{' '}
            </span>
            <span className="text-[#303236]/40">meaningful impact.</span>
          </h2>

          <a
            href="/about"
            className="shrink-0 inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#E65416] hover:text-[#303236] transition-colors whitespace-nowrap"
          >
            About Us <i className="ri-arrow-right-line" />
          </a>
        </div>

        {visibleMembers.length > 0 && (
          <a href="/about#team" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 group/team">
            {visibleMembers.map((member, i) => (
              <div
                key={`slot-${i}`}
                className="relative overflow-hidden rounded-xl border border-[#303236]/8 transition-opacity duration-350"
                style={{ opacity: slotFade[i] ? 1 : 0 }}
              >
                <div className="w-full aspect-[3/4] bg-[#D8D6C9] flex items-center justify-center">
                  {member.hasPhoto ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/team:scale-105"
                    />
                  ) : (
                    <i className="ri-user-line text-2xl text-[#303236]/30" />
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                  <p className="text-white text-[11px] font-semibold leading-snug">{member.name}</p>
                  <p className="text-white/60 text-[10px]">{member.role}</p>
                </div>
              </div>
            ))}
          </a>
        )}
      </div>
    </section>
  );
}
