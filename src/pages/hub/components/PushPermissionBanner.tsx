import { usePushSubscription } from '@/hooks/usePushSubscription';

interface Props {
  userId: string | undefined;
}

export default function PushPermissionBanner({ userId }: Props) {
  const { status, subscribe, dismiss, isDismissed } = usePushSubscription(userId);

  if (status !== 'default' || isDismissed) return null;

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px)+5.5rem)] lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(420px,90vw)] bg-white border border-gray-200 rounded-2xl shadow-xl px-5 py-4 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-2xl mt-0.5">🔔</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">Stay in the loop</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Get notified when tasks are assigned or updated — even when Sentro isn't open.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={subscribe}
            className="text-xs font-semibold bg-indigo-600 text-white rounded-full px-4 py-1.5 hover:bg-indigo-700 transition-colors"
          >
            Enable notifications
          </button>
          <button
            onClick={dismiss}
            className="text-xs font-medium text-gray-400 rounded-full px-3 py-1.5 hover:text-gray-600 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 text-lg leading-none">✕</button>
    </div>
  );
}
