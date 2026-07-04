// Shared task/project UI config — was duplicated across the admin and
// employee project pages.

export const PRIORITY_CFG: Record<'high' | 'medium' | 'low', { label: string; cls: string }> = {
  high:   { label: 'High', cls: 'bg-rose-100 text-rose-600' },
  medium: { label: 'Med',  cls: 'bg-amber-100 text-amber-600' },
  low:    { label: 'Low',  cls: 'bg-gray-100 text-gray-500' },
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  ongoing:   'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  paused:    'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
