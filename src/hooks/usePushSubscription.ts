import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
const DISMISSED_KEY = 'push-permission-dismissed';

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'default' | 'loading';

export function usePushSubscription(userId: string | undefined) {
  const [status, setStatus] = useState<PushStatus>('loading');

  useEffect(() => {
    if (!userId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      setStatus('unsupported');
      return;
    }
    const permission = Notification.permission;
    if (permission === 'denied') { setStatus('denied'); return; }
    if (permission === 'granted') { setStatus('subscribed'); return; }
    setStatus('default');
  }, [userId]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId || !VAPID_PUBLIC_KEY) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return false; }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await supabase.from('hub_push_subscriptions').upsert(
        { user_id: userId, endpoint: json.endpoint!, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        { onConflict: 'user_id,endpoint' }
      );

      setStatus('subscribed');
      return true;
    } catch (err) {
      console.error('Push subscribe failed:', err);
      return false;
    }
  }, [userId]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setStatus('denied');
  }, []);

  const isDismissed = localStorage.getItem(DISMISSED_KEY) === '1';

  return { status, subscribe, dismiss, isDismissed };
}
