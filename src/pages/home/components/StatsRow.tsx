const stats = [
  { value: '100+', label: 'Projects Delivered' },
  { value: '4.8★', label: 'Client Rating' },
  { value: '38+', label: 'Brands Built' },
  { value: '3+', label: 'Years of Experience' },
];

export default function StatsRow() {
  return (
    <section className="relative py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#303236]">{stat.value}</p>
            <p className="text-[10px] sm:text-xs text-[#303236]/40 tracking-wide uppercase mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
