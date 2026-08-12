// Same real client list used on the Portfolio page marquee (src/pages/portfolio/page.tsx).
const clients = [
  'The Cowart Team', 'Mile One', 'Cyberbacker', 'Arlington Abodes',
  'WJD Management', 'MMK Realty', 'The Real Estate Store',
  'Urbana Pediatric Dentistry', 'Traditions Dental', 'Everyone By One',
  'Once Upon a Tooth', 'Hello Kids Dentistry', 'Agape Pediatric Dentistry',
  'Tooth Patrol PD', 'Dirty Soul', 'Capital Energy Training',
  'Randy Huntley Home Selling Team', 'NEP', 'Kei Coffee House',
  'ROL', 'VOX', 'Kei Concepts', 'KIN', 'Blue Collar Nutrition',
  'INI', 'QUA', 'SUP', 'Nalu Boutique', 'Lakeview Enterprise Campus',
  'KEY Groups', 'Sperry Key Groups', 'Equestrian International',
  'The Second Haus', 'Uji-Matcha Cafe', 'Whisk Up Matcha',
  'FS Architects', 'Peak Coffee Roasters', 'Hulma Cebu',
];

export default function ClientMarquee() {
  return (
    <section className="relative py-5 overflow-hidden border-b border-[#303236]/8">
      <div className="flex whitespace-nowrap animate-marquee">
        {[...clients, ...clients].map((client, i) => (
          <span key={i} className="inline-flex items-center gap-4 mx-6 md:mx-10">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#303236]/60 font-display">
              {client}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#A0C9CB]" />
          </span>
        ))}
      </div>
    </section>
  );
}
