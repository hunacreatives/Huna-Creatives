// Guest homepage.

import { Link } from 'react-router-dom';
import { CLASS, IMAGES, LOC, PRODUCT, TODAY_KEY, instructors, locations, retreats, sessions, videos } from '../lib/data';
import { addDays, pesoWithUsd, peso, rangeLabel, relativeDay, studioDateKey, studioTime, tzCity, yourTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import { Wrap } from '../ui/layouts';
import { Avatar, ButtonLink, Icon, Panel, Photo, btnClass, cx } from '../ui/kit';
import { spots, teacherName } from './ScheduleBits';

const H2 = ({ children }: { children: string }) => <h2 className="serif text-[26px] md:text-[32px] leading-tight">{children}</h2>;

export default function Home() {
  const { viewerTz, myBookings } = useDemo();
  const now = Date.now();
  const tomorrow = addDays(TODAY_KEY, 1);

  const next = sessions
    .filter((s) => s.locationId === 'beach' && s.status === 'scheduled' && new Date(s.start).getTime() > now
      && [TODAY_KEY, tomorrow].includes(studioDateKey(s.start)))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 4);
  const allToday = next.length > 0 && next.every((s) => studioDateKey(s.start) === TODAY_KEY);

  const featured = retreats
    .filter((r) => r.status === 'published' && r.kind === 'multi' && r.startDate > TODAY_KEY)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const fromPrice = featured ? Math.min(...featured.rooms.map((r) => r.pricePerPerson)) : 0;

  const nextLive = sessions
    .filter((s) => s.locationId === null && s.status === 'scheduled' && new Date(s.start).getTime() > now)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const intro = PRODUCT.intro;

  return (
    <>
      {/* Hero */}
      <Wrap className="pt-4 md:pt-6">
        <section className="relative overflow-hidden rounded-[28px] h-[540px] md:h-[620px]">
          <img src={IMAGES.hero} alt="Sunset over the water from the Seaside studio" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,22,26,0.78)_0%,rgba(14,22,26,0.35)_45%,rgba(14,22,26,0)_75%)]" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 text-white">
            <h1 className="serif text-[40px] md:text-[64px] leading-[1.04] max-w-[14ch]">Yoga for slow mornings and long evenings</h1>
            <p className="mt-4 text-[16px] md:text-[18px] text-white/85 max-w-[44ch] leading-relaxed">
              One studio on the beach, one in town. Classes every day, all levels welcome.
            </p>
            <div className="mt-6 md:mt-8 flex flex-wrap gap-3">
              <ButtonLink to={to('/schedule')} size="lg">See the schedule</ButtonLink>
              <Link to={to('/retreats')}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full text-[15.5px] font-medium text-white bg-white/15 border border-white/40 backdrop-blur-md hover:bg-white/25 transition-colors">
                Retreats
              </Link>
            </div>
          </div>
        </section>
      </Wrap>

      {/* Next classes + featured retreat */}
      <Wrap className="mt-10 md:mt-14 grid gap-8 lg:gap-6 lg:grid-cols-[1.35fr_1fr] items-start">
        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <H2>{allToday || next.length === 0 ? 'Today at Seaside' : 'Next at Seaside'}</H2>
            <Link to={to('/schedule?location=beach')} className="inline-flex items-center gap-1 h-11 text-[14px] font-medium text-[var(--teal)] whitespace-nowrap">
              Full schedule<Icon name="ri-arrow-right-line" />
            </Link>
          </div>
          <Panel pad={false} className="overflow-hidden">
            {next.length === 0 ? (
              <p className="px-5 py-8 text-[14.5px] text-[var(--ink-2)]">No more classes today or tomorrow. The full schedule runs two weeks ahead.</p>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {next.map((s) => {
                  const c = CLASS[s.classTypeId];
                  const sp = spots(s);
                  const key = studioDateKey(s.start);
                  const mine = myBookings.find((b) => b.sessionId === s.id)?.status;
                  const room = LOC.beach.rooms.find((r) => r.id === s.roomId)?.name;
                  return (
                    <Link key={s.id} to={to(`/schedule?location=beach&session=${s.id}`)}
                      className="flex items-center gap-3 md:gap-5 px-4 md:px-6 py-4 min-h-[76px] hover:bg-[rgba(7,80,86,0.03)] transition-colors">
                      <div className="w-[70px] md:w-[88px] flex-shrink-0">
                        <div className="num text-[15px] font-semibold leading-snug">{studioTime(s.start)}</div>
                        <div className="num text-[12px] text-[var(--ink-3)] mt-0.5 leading-tight">
                          {yourTime(s.start, viewerTz)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium leading-snug">{c.name}</div>
                        <div className="text-[13px] text-[var(--ink-2)] mt-0.5 leading-snug">{teacherName(s)} · {room}</div>
                        <div className={cx('text-[12.5px] mt-1 num text-[var(--ink-3)]')}>
                          {key !== TODAY_KEY && <span className="font-medium text-[var(--ink-2)]">{relativeDay(key)} · </span>}
                          {c.duration} min · <span className={cx(sp.low && 'text-[var(--warn)] font-medium')}>{sp.text}</span>
                        </div>
                      </div>
                      {mine === 'booked'
                        ? <span className={btnClass('quiet', 'sm')}><Icon name="ri-check-line" />Booked</span>
                        : mine === 'waitlist'
                          ? <span className={btnClass('quiet', 'sm')}>Waitlisted</span>
                          : <span className={cx(btnClass(sp.full ? 'secondary' : 'primary', 'sm'), 'min-w-[72px]')}>{sp.full ? 'Waitlist' : 'Book'}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
            <Link to={to('/passes')}
              className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-[var(--line)] bg-[rgba(246,241,234,0.7)] hover:bg-[var(--sand)] transition-colors">
              <span className="text-[14px] text-[var(--ink-2)]">
                <span className="font-medium text-[var(--ink)]">New here?</span> Your first week is {intro.credits} classes for <span className="num">{peso(intro.price)}</span>.
              </span>
              <Icon name="ri-arrow-right-line" className="text-[var(--teal)] text-[18px] flex-shrink-0" />
            </Link>
          </Panel>
        </section>

        {featured && (
          <section>
            <div className="mb-4 flex items-end h-auto lg:h-11"><H2>Next retreat</H2></div>
            <Link to={to(`/retreats/${featured.slug}`)} className="group block">
              <Panel pad={false} className="overflow-hidden">
                <div className="h-56 md:h-64 overflow-hidden">
                  <Photo src={featured.images[0] === IMAGES.hero ? IMAGES.cove : featured.images[0]} alt={featured.title}
                    className="transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="p-5 md:p-6">
                  <div className="text-[13.5px] text-[var(--ink-2)] num">{rangeLabel(featured.startDate, featured.endDate)} · {LOC[featured.locationId].name}</div>
                  <h3 className="serif text-[24px] leading-tight mt-1.5">{featured.title}</h3>
                  <p className="text-[14.5px] text-[var(--ink-2)] mt-2 leading-relaxed">{featured.summary}</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="text-[14px]">
                      <span className="text-[var(--ink-3)]">From </span>
                      <span className="num font-medium">{pesoWithUsd(fromPrice)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--teal)]">View<Icon name="ri-arrow-right-line" /></span>
                  </div>
                </div>
              </Panel>
            </Link>
          </section>
        )}
      </Wrap>

      {/* Studios */}
      <Wrap className="mt-14 md:mt-20">
        <div className="mb-4"><H2>Two studios</H2></div>
        <div className="grid gap-5 md:grid-cols-2">
          {locations.map((l) => {
            const teachers = instructors.filter((t) => t.locations.includes(l.id)).length;
            return (
              <Link key={l.id} to={to(`/schedule?location=${l.id}`)} className="group block">
                <Panel pad={false} className="overflow-hidden h-full flex flex-col">
                  <div className="h-52 md:h-64 overflow-hidden">
                    <Photo src={l.image} alt={`${l.name} studio`} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="p-5 md:p-6 flex-1 flex flex-col">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="serif text-[24px]">{l.name}</h3>
                      <span className="text-[13px] text-[var(--ink-3)]">{l.area}</span>
                    </div>
                    <p className="text-[14.5px] text-[var(--ink-2)] mt-2 leading-relaxed flex-1">{l.blurb}</p>
                    <div className="mt-4 flex items-center justify-between text-[14px]">
                      <span className="text-[var(--ink-3)]">{l.rooms.length === 1 ? '1 room' : `${l.rooms.length} rooms`} · {teachers} teachers</span>
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--teal)]">{l.name} classes<Icon name="ri-arrow-right-line" /></span>
                    </div>
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      </Wrap>

      {/* Online */}
      <Wrap className="mt-14 md:mt-20">
        <Panel pad={false} className="overflow-hidden grid md:grid-cols-[1fr_1.1fr]">
          <div className="p-6 md:p-10 flex flex-col justify-center order-2 md:order-1">
            <H2>Practise from home, too</H2>
            <p className="text-[15px] text-[var(--ink-2)] mt-3 leading-relaxed max-w-[44ch]">
              Live classes streamed from the studio each week, and {videos.length} recorded ones to do whenever suits you.
            </p>
            {nextLive && (
              <div className="mt-5 flex items-center gap-3 text-[14px]">
                <span className="w-10 h-10 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center flex-shrink-0">
                  <Icon name="ri-live-line" className="text-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{CLASS[nextLive.classTypeId].name}</div>
                  <div className="text-[var(--ink-2)] num">
                    {relativeDay(studioDateKey(nextLive.start))} · {yourTime(nextLive.start, viewerTz)} your time ({tzCity(viewerTz)})
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6">
              <ButtonLink to={to('/online')} variant="secondary" iconRight="ri-arrow-right-line">Online classes</ButtonLink>
            </div>
          </div>
          <div className="h-56 md:h-auto md:min-h-[340px] order-1 md:order-2">
            <Photo src={IMAGES.yoga} alt="Yoga on the beach" />
          </div>
        </Panel>
      </Wrap>

      {/* Teachers */}
      <Wrap className="mt-14 md:mt-20">
        <div className="mb-4"><H2>Teachers</H2></div>
        <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-3 overflow-x-auto no-bar snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible">
          {instructors.map((t) => (
            <Panel key={t.id} pad={false} className="snap-start flex-shrink-0 w-[220px] lg:w-auto p-5">
              <Avatar name={t.name} color={t.color} size={52} />
              <div className="mt-3 font-medium">{t.name}</div>
              <div className="text-[13px] text-[var(--ink-2)] mt-0.5">{t.styles.join(', ')}</div>
              <div className="text-[12.5px] text-[var(--ink-3)] mt-2 flex items-center gap-1">
                <Icon name="ri-map-pin-line" />{t.locations.map((id) => LOC[id].name).join(' · ')}
              </div>
            </Panel>
          ))}
        </div>
      </Wrap>
    </>
  );
}
