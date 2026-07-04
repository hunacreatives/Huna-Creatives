// Gradient palette per service type — shared by the admin and employee
// project pages (was duplicated as getServicePalette / getCardPalette).
export const getServicePalette = (service: string | null | undefined) => {
  const s = (service ?? '').toLowerCase();
  if (s.includes('website design'))      return { from: '#6366f1', to: '#8b5cf6' }; // indigo-violet
  if (s.includes('website maintenance')) return { from: '#0ea5e9', to: '#6366f1' }; // sky-indigo
  if (s.includes('branding'))            return { from: '#ec4899', to: '#f97316' }; // pink-orange
  if (s.includes('graphic'))             return { from: '#f97316', to: '#f59e0b' }; // orange-amber
  if (s.includes('social media'))        return { from: '#10b981', to: '#0ea5e9' }; // emerald-sky
  if (s.includes('content'))             return { from: '#14b8a6', to: '#6366f1' }; // teal-indigo
  if (s.includes('seo'))                 return { from: '#84cc16', to: '#10b981' }; // lime-emerald
  if (s.includes('digital ads') || s.includes('ads')) return { from: '#f59e0b', to: '#ef4444' }; // amber-red
  if (s.includes('email'))               return { from: '#8b5cf6', to: '#ec4899' }; // violet-pink
  if (s.includes('marketing'))           return { from: '#f97316', to: '#f59e0b' }; // orange-amber
  return                                        { from: '#94a3b8', to: '#64748b' }; // gray — other/internal
};
