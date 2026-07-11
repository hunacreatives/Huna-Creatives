import { useEffect, useState } from 'react';

// Interactive PWA install guide for the Sentro hub. Public — shareable in
// onboarding emails/Slack before the employee can log in.
// Android/Chrome: captures beforeinstallprompt for a real one-tap install.
// iOS: no install API exists, so it walks through Share → Add to Home Screen.

type Platform = 'ios' | 'android' | 'desktop';

const HUB_URL = 'https://www.hunacreatives.com/hub/install';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// In-app browsers (Gmail, Slack, Messenger…) can't install PWAs — the user
// must escape to the real browser first.
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line\/|Slack|GSA\/|Gmail|Messenger/i.test(ua);
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [installed, setInstalled] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(0);
  // Older iOS launches the exact page that was saved instead of the manifest
  // start_url — index.html redirects before boot; this guards the rare case
  // where the app still mounts, rendering nothing instead of flashing the guide.
  const [redirecting] = useState(isStandalone);

  useEffect(() => {
    if (isStandalone()) {
      window.location.replace('/hub/login');
      return;
    }
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    setInApp(isInAppBrowser());

    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installEvent) return;
    setInstalling(true);
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstalling(false);
    setInstallEvent(null);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(HUB_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const iosSteps = [
    {
      icon: 'ri-safari-line',
      title: 'Open this page in Safari',
      body: 'The install option only exists in Safari. If you\'re reading this inside another app (Gmail, Slack, Chrome), copy the link below and paste it into Safari first.',
      onlyIf: inApp,
    },
    {
      icon: 'ri-share-box-line',
      title: 'Tap the Share button',
      body: 'It\'s the square with an arrow pointing up, at the bottom center of Safari (or top right on iPad).',
    },
    {
      icon: 'ri-add-box-line',
      title: 'Tap "Add to Home Screen"',
      body: 'Scroll down the share menu a little if you don\'t see it right away.',
    },
    {
      icon: 'ri-checkbox-circle-line',
      title: 'Tap "Add"',
      body: 'Sentro appears on your home screen like a regular app — with push notifications and full-screen mode.',
    },
  ].filter(s => s.onlyIf === undefined || s.onlyIf);

  const androidSteps = [
    {
      icon: 'ri-chrome-line',
      title: 'Open this page in Chrome',
      body: 'If you\'re inside another app\'s browser, copy the link below and open it in Chrome.',
      onlyIf: inApp,
    },
    {
      icon: 'ri-more-2-fill',
      title: 'Tap the ⋮ menu',
      body: 'Top right corner of Chrome.',
    },
    {
      icon: 'ri-download-2-line',
      title: 'Tap "Install app" (or "Add to Home screen")',
      body: 'Confirm, and Sentro installs like a regular app.',
    },
  ].filter(s => s.onlyIf === undefined || s.onlyIf);

  const steps = platform === 'ios' ? iosSteps : androidSteps;

  if (redirecting) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-5 py-10 overflow-x-clip">
      {/* Header */}
      <div className="w-full max-w-md mx-auto text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-[#FF6B35] mx-auto mb-4 flex items-center justify-center shadow-lg shadow-orange-200">
          <img src="/s-logo.png" alt="Sentro" className="w-9 h-9 object-contain" style={{ filter: 'invert(1)' }} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Install Sentro on your phone</h1>
        <p className="text-sm text-gray-500 mt-2">
          Sentro works as a mobile app — full screen, on your home screen, with push notifications for tasks, payouts, and announcements.
        </p>
      </div>

      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Already installed */}
        {installed ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <i className="ri-checkbox-circle-fill text-4xl text-emerald-500 block mb-2"></i>
            <p className="font-semibold text-emerald-800">You're all set!</p>
            <p className="text-sm text-emerald-600 mt-1">Sentro is installed{isStandalone() ? " — you're using it right now." : ' on this device.'}</p>
          </div>
        ) : platform === 'desktop' ? (
          /* Desktop: send them to their phone */
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <i className="ri-smartphone-line text-indigo-500 text-lg"></i>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">This guide is for your phone</p>
                <p className="text-xs text-gray-400">Open this same link on your mobile device</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <span className="text-xs text-gray-600 truncate flex-1 font-mono">{HUB_URL}</span>
              <button onClick={copyLink}
                className="text-xs font-semibold text-[#FF6B35] hover:text-[#e55a27] cursor-pointer flex-shrink-0 flex items-center gap-1">
                <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}></i>{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Tip: on desktop Chrome you can also install Sentro — look for the <i className="ri-download-2-line"></i> install icon at the right end of the address bar.
            </p>
          </div>
        ) : (
          <>
            {/* One-tap install (Android with captured prompt) */}
            {platform === 'android' && installEvent && (
              <button onClick={triggerInstall} disabled={installing}
                className="w-full py-4 bg-[#FF6B35] hover:bg-[#e55a27] text-white font-bold rounded-2xl shadow-lg shadow-orange-200 cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <i className={installing ? 'ri-loader-4-line animate-spin' : 'ri-download-2-fill'}></i>
                {installing ? 'Installing…' : 'Install Sentro Now'}
              </button>
            )}
            {platform === 'android' && installEvent && (
              <p className="text-center text-xs text-gray-400">One tap — or follow the manual steps below.</p>
            )}

            {/* In-app browser escape hatch */}
            {inApp && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <i className="ri-error-warning-line text-amber-500 text-lg flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">You're inside another app's browser</p>
                  <p className="text-xs text-amber-700 mt-1">Apps like Gmail and Slack can't install Sentro. Copy this link and open it in {platform === 'ios' ? 'Safari' : 'Chrome'}:</p>
                  <button onClick={copyLink}
                    className="mt-2 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                    <i className={`${copied ? 'ri-check-line' : 'ri-file-copy-line'} mr-1`}></i>{copied ? 'Link copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}

            {/* Interactive steps */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {steps.map((s, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button key={i} onClick={() => setStep(i)}
                    className={`w-full text-left px-5 py-4 flex items-start gap-3.5 transition-colors cursor-pointer border-b border-gray-50 last:border-0 ${active ? 'bg-orange-50/60' : 'hover:bg-gray-50/60'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors ${
                      done ? 'bg-emerald-100 text-emerald-600' : active ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? <i className="ri-check-line"></i> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-600'}`}>
                        <i className={`${s.icon} mr-1.5 ${active ? 'text-[#FF6B35]' : 'text-gray-300'}`}></i>{s.title}
                      </p>
                      {active && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{s.body}</p>}
                    </div>
                  </button>
                );
              })}
              {/* Step nav */}
              <div className="px-5 py-3.5 bg-gray-50/70 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Step {step + 1} of {steps.length}</span>
                {step < steps.length - 1 ? (
                  <button onClick={() => setStep(step + 1)}
                    className="text-xs font-semibold bg-[#111827] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                    Done, next step →
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600"><i className="ri-checkbox-circle-fill mr-1"></i>That's it!</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-300 pt-4">
          Sentro by Huna Creatives · Once installed, log in with your hub account
        </p>
      </div>
    </div>
  );
}
