import { useState, useEffect, useRef } from 'react';

// Scene durations in ms — total = 15000
const DURATIONS = [2800, 2700, 3000, 2800, 3700];

const REEL_CSS = `
  @import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');

  @keyframes rFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes rScaleIn {
    from { opacity: 0; transform: scale(0.82); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes rSlideLeft {
    from { opacity: 0; transform: translateX(-22px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes rSlideUp {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rPop {
    0%   { opacity: 0; transform: scale(0.6); }
    70%  { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes rGlowBreath {
    0%, 100% {
      text-shadow:
        0 0 20px rgba(255,205,100,1),
        0 0 50px rgba(255,175,65,0.85),
        0 0 100px rgba(255,145,40,0.65),
        0 0 180px rgba(255,110,18,0.38),
        0 0 280px rgba(255,85,8,0.16);
    }
    50% {
      text-shadow:
        0 0 32px rgba(255,215,120,1),
        0 0 70px rgba(255,190,82,0.92),
        0 0 140px rgba(255,160,55,0.72),
        0 0 240px rgba(255,128,28,0.46),
        0 0 380px rgba(255,100,12,0.22);
    }
  }
  @keyframes rGlowBg {
    0%, 100% { opacity: 0.22; }
    50%       { opacity: 0.38; }
  }
  @keyframes rOrangeGlow {
    0%, 100% { box-shadow: 0 0 28px rgba(255,107,53,0.45), 0 0 60px rgba(255,107,53,0.18); }
    50%       { box-shadow: 0 0 40px rgba(255,107,53,0.65), 0 0 90px rgba(255,107,53,0.28); }
  }
  @keyframes rSceneFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes rFloat {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes rPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }

  .r-fade-up   { animation: rFadeUp   0.55s cubic-bezier(.22,.68,0,1.15) both; }
  .r-fade-in   { animation: rFadeIn   0.5s  ease both; }
  .r-scale-in  { animation: rScaleIn  0.5s  cubic-bezier(.22,.68,0,1.2) both; }
  .r-slide-left{ animation: rSlideLeft 0.45s ease both; }
  .r-slide-up  { animation: rSlideUp  0.6s  cubic-bezier(.22,.68,0,1.1) both; }
  .r-pop       { animation: rPop      0.4s  cubic-bezier(.22,.68,0,1.3) both; }

  .d1 { animation-delay: 0.10s; }
  .d2 { animation-delay: 0.22s; }
  .d3 { animation-delay: 0.34s; }
  .d4 { animation-delay: 0.46s; }
  .d5 { animation-delay: 0.58s; }
  .d6 { animation-delay: 0.70s; }
  .d7 { animation-delay: 0.82s; }
  .d8 { animation-delay: 0.94s; }
  .d9 { animation-delay: 1.06s; }
`;

// ─── Grain overlay ─────────────────────────────────────────────────────────────
const Grain = () => (
  <div className="absolute inset-0 pointer-events-none z-10"
    style={{
      opacity: 0.045,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '200px',
    }} />
);

// ─── Scene 1: The Problem ──────────────────────────────────────────────────────
function Scene1() {
  const tools = ['WhatsApp','Spreadsheets','Email threads','Notion','Slack DMs','Paper trails','Google Forms','Dropbox links'];
  const rotations = [-3,-1.5,2,1,-2.5,3,-1,2];
  return (
    <div className="absolute inset-0 flex flex-col" style={{ animation: 'rSceneFade 0.4s ease both', background: 'linear-gradient(160deg, #0d0204 0%, #1a0505 50%, #0a0204 100%)' }}>
      <Grain />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(220,38,38,0.14) 0%, transparent 65%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 10%, rgba(180,20,20,0.08) 0%, transparent 60%)' }} />

      <div className="relative z-20 flex flex-col h-full px-8 pt-16 pb-10">
        {/* Tag */}
        <div className="r-fade-in">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            Sound familiar?
          </span>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="font-black text-white leading-[0.95] mb-8 r-fade-up d1"
            style={{ fontSize: 'clamp(2.6rem, 10vw, 3.8rem)', letterSpacing: '-0.04em' }}>
            Still running<br />your team<br />on <span style={{ color: '#f87171' }}>this?</span>
          </h1>

          {/* Scattered pills */}
          <div className="flex flex-wrap gap-2.5">
            {tools.map((t, i) => (
              <span key={t}
                className={`r-pop d${i + 1} text-xs font-semibold px-3.5 py-1.5 rounded-full`}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  transform: `rotate(${rotations[i]}deg)`,
                }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <p className="text-sm text-gray-700 r-fade-in d6">There's a better way.</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px z-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)' }} />
    </div>
  );
}

// ─── Scene 2: The Cost ─────────────────────────────────────────────────────────
function Scene2() {
  const pains = [
    { icon: 'ri-user-unfollow-line', text: 'Missed punch-ins nobody catches' },
    { icon: 'ri-money-dollar-circle-line', text: 'Payroll errors every cutoff' },
    { icon: 'ri-lock-unlock-line', text: 'Passwords shared over Messenger' },
    { icon: 'ri-file-damage-line', text: 'Documents scattered everywhere' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col" style={{ animation: 'rSceneFade 0.4s ease both', background: 'linear-gradient(160deg, #0d0303 0%, #1c0606 60%, #0d0303 100%)' }}>
      <Grain />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 100%, rgba(220,38,38,0.18) 0%, transparent 60%)' }} />

      <div className="relative z-20 flex flex-col h-full px-8 pt-16 pb-10 justify-center gap-8">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full r-fade-in"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            The real cost
          </span>
          <h1 className="font-black text-white leading-tight mt-5 r-fade-up d1"
            style={{ fontSize: 'clamp(2.2rem, 8.5vw, 3.2rem)', letterSpacing: '-0.04em' }}>
            Every crack<br />in your system<br />has a{' '}
            <span style={{ color: '#f87171', textShadow: '0 0 24px rgba(239,68,68,0.5)' }}>price.</span>
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {pains.map((p, i) => (
            <div key={p.text}
              className={`r-slide-left d${i + 2} flex items-center gap-3.5 rounded-2xl px-4 py-3.5`}
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.12)' }}>
                <i className={`${p.icon} text-red-400 text-lg`}></i>
              </div>
              <span className="text-sm text-gray-400 leading-snug">{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3: The Reveal ───────────────────────────────────────────────────────
function Scene3() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ animation: 'rSceneFade 0.5s ease both', background: 'linear-gradient(160deg, #060c18 0%, #0a1020 60%, #060a14 100%)' }}>
      <Grain />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,107,53,0.12) 0%, transparent 65%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 100%, rgba(255,107,53,0.08) 0%, transparent 60%)' }} />

      <div className="relative z-20 flex flex-col h-full px-8 pt-14 pb-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full self-start r-fade-in"
          style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.25)' }}>
          The solution
        </span>

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          {/* Logo mark */}
          <div className="r-scale-in d1" style={{ animation: 'rScaleIn 0.5s cubic-bezier(.22,.68,0,1.2) 0.1s both, rFloat 3.5s ease-in-out 1s infinite' }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(255,107,53,0.14)', border: '1px solid rgba(255,107,53,0.3)', boxShadow: '0 0 50px rgba(255,107,53,0.3), 0 0 100px rgba(255,107,53,0.12)' }}>
              <i className="ri-layout-grid-line text-4xl text-[#FF6B35]"></i>
            </div>
          </div>

          <div>
            <h1 className="font-black text-white leading-none r-fade-up d2"
              style={{ fontSize: 'clamp(3rem, 12vw, 4.5rem)', letterSpacing: '-0.04em', textShadow: '0 0 60px rgba(255,107,53,0.25)' }}>
              SENTRO<span style={{ color: '#FF6B35' }}> OS</span>
            </h1>
            <p className="text-gray-500 text-sm mt-3 leading-relaxed r-fade-in d3">
              Your own internal operations hub —<br />built around your team's exact workflow.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center r-fade-in d4">
            {['Not a SaaS.','Not a template.','Yours.'].map(t => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.18)', color: 'rgba(255,107,53,0.8)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-700 text-center r-fade-in d5">by Huna Creatives</p>
      </div>
    </div>
  );
}

// ─── Scene 4: What's Inside ────────────────────────────────────────────────────
function Scene4() {
  const features = [
    { icon: 'ri-time-line',                 label: 'Attendance' },
    { icon: 'ri-money-dollar-circle-line',  label: 'Payroll' },
    { icon: 'ri-folder-line',               label: 'Documents' },
    { icon: 'ri-shield-keyhole-line',       label: 'Credentials' },
    { icon: 'ri-building-line',             label: 'Projects' },
    { icon: 'ri-book-open-line',            label: 'SOPs' },
    { icon: 'ri-megaphone-line',            label: 'Announcements' },
    { icon: 'ri-inbox-line',               label: 'Requests' },
    { icon: 'ri-timer-flash-line',          label: 'Overtime' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col" style={{ animation: 'rSceneFade 0.4s ease both', background: 'linear-gradient(160deg, #060a14 0%, #0c1020 100%)' }}>
      <Grain />
      <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(255,107,53,0.1), transparent 65%)' }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle at bottom left, rgba(255,107,53,0.07), transparent 65%)' }} />

      <div className="relative z-20 flex flex-col h-full px-8 pt-14 pb-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full self-start r-fade-in"
          style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.25)' }}>
          What's inside
        </span>

        <h1 className="font-black text-white mt-5 mb-7 leading-tight r-fade-up d1"
          style={{ fontSize: 'clamp(2.2rem, 8.5vw, 3rem)', letterSpacing: '-0.04em' }}>
          One hub.<br /><span style={{ color: '#FF6B35' }}>Everything</span><br />managed.
        </h1>

        <div className="grid grid-cols-3 gap-2.5 flex-1">
          {features.map((f, i) => (
            <div key={f.label}
              className={`r-pop d${Math.min(i + 1, 9)} flex flex-col items-center justify-center gap-2 rounded-2xl`}
              style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.14)' }}>
              <i className={`${f.icon} text-[#FF6B35] text-2xl`}></i>
              <span className="text-[11px] font-semibold text-gray-500">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 5: The Hero (SENTRO OS glowing) ────────────────────────────────────
function Scene5() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ animation: 'rSceneFade 0.6s ease both', background: 'linear-gradient(175deg, #0c0700 0%, #110900 35%, #090600 70%, #070500 100%)' }}>
      <Grain />

      {/* Ambient warm glow behind text */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 90% 50% at 50% 48%, rgba(170,95,18,0.26) 0%, rgba(110,55,8,0.12) 45%, transparent 72%)', animation: 'rGlowBg 3s ease-in-out infinite' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 30% at 50% 46%, rgba(255,180,55,0.07) 0%, transparent 60%)' }} />

      {/* Bottom floor glow */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(255,107,53,0.06) 0%, transparent 100%)' }} />

      <div className="relative z-20 flex flex-col h-full px-8 pt-16 pb-10">
        {/* Top label */}
        <div className="r-fade-in" style={{ animationDelay: '0.3s' }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(200,155,70,0.5)' }}>
            Internal Ops Platform
          </span>
        </div>

        {/* Big glowing SENTRO OS */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="r-fade-up d2">
            <div className="font-black text-white leading-[0.88]"
              style={{
                fontSize: 'clamp(5rem, 20vw, 7.5rem)',
                letterSpacing: '-0.045em',
                color: '#fffaf2',
                animation: 'rGlowBreath 3.2s ease-in-out 0.5s infinite',
              }}>
              SENTRO
            </div>
            <div className="flex justify-end items-baseline gap-3 -mt-1">
              <span className="font-black"
                style={{
                  fontSize: 'clamp(2rem, 8vw, 3rem)',
                  letterSpacing: '-0.03em',
                  color: '#f5e5c0',
                  animation: 'rGlowBreath 3.2s ease-in-out 0.8s infinite',
                }}>
                OS
              </span>
            </div>
          </div>

          <div className="flex justify-end r-fade-in d3">
            <span className="text-[9px] font-bold tracking-[0.22em] uppercase"
              style={{ color: 'rgba(195,148,60,0.5)' }}>
              BY HUNA CREATIVES
            </span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-col gap-3 r-slide-up d4">
          <p className="text-sm text-gray-600 text-center">Your team's ops. One hub. Built for you.</p>
          <div className="w-full py-4 rounded-2xl text-center font-black text-white text-base"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #e55a27)', animation: 'rOrangeGlow 2.5s ease-in-out 1s infinite' }}>
            Book a Free Demo →
          </div>
          <p className="text-[10px] text-center" style={{ color: 'rgba(175,125,50,0.45)' }}>
            hunacreatives.com/sentro-os
          </p>
        </div>
      </div>
    </div>
  );
}

const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ReelPage() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const elapsedRef = useRef<ReturnType<typeof setInterval>>();

  const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);

  const stopAll = () => {
    clearTimeout(timerRef.current);
    clearInterval(elapsedRef.current);
  };

  const playScene = (idx: number, startElapsed: number) => {
    setScene(idx);
    if (idx >= SCENES.length) {
      setPlaying(false);
      stopAll();
      return;
    }
    timerRef.current = setTimeout(() => playScene(idx + 1, startElapsed + DURATIONS[idx]), DURATIONS[idx]);
  };

  const start = () => {
    stopAll();
    setElapsed(0);
    setPlaying(true);
    playScene(0, 0);
    elapsedRef.current = setInterval(() => {
      setElapsed(e => {
        if (e >= TOTAL) { clearInterval(elapsedRef.current); return TOTAL; }
        return e + 50;
      });
    }, 50);
  };

  const stop = () => {
    stopAll();
    setPlaying(false);
  };

  useEffect(() => () => stopAll(), []);

  const recordReel = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 } as MediaTrackConstraints,
        audio: false,
      });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sentro-os-reel.webm';
        a.click();
        URL.revokeObjectURL(url);
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
      start();
      setTimeout(() => {
        recorder.stop();
        stream.getTracks().forEach(t => t.stop());
      }, TOTAL + 600);
    } catch {
      // user cancelled screen pick
    }
  };

  const SceneComponent = SCENES[Math.min(scene, SCENES.length - 1)];
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center px-4 py-8">
      <style>{REEL_CSS}</style>

      <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-5">Sentro OS · 15s Reel · 9:16</p>

      {/* Reel container */}
      <div ref={reelRef} className="relative overflow-hidden rounded-3xl shadow-2xl"
        style={{ width: 'min(390px, 100%)', aspectRatio: '9/16', background: '#040408', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}>
        {playing
          ? <SceneComponent key={scene} />
          : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: 'linear-gradient(160deg, #060a14, #0a0c18)' }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)' }}>
                <i className="ri-play-fill text-4xl text-[#FF6B35]"></i>
              </div>
              <p className="text-gray-600 text-sm">Press Play to preview</p>
            </div>
          )
        }
      </div>

      {/* Progress bar */}
      <div className="w-full mt-4" style={{ maxWidth: 390 }}>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-none"
            style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #FF6B35, #f97316)' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-700">{Math.round(elapsed / 1000)}s</span>
          <span className="text-[9px] text-gray-700">{TOTAL / 1000}s</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2.5 mt-4" style={{ width: 'min(390px, 100%)' }}>
        <button
          onClick={playing ? stop : start}
          className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cursor-pointer transition-all"
          style={{ background: playing ? 'rgba(255,255,255,0.06)' : 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35' }}>
          <i className={`${playing ? 'ri-stop-fill' : 'ri-play-fill'} text-lg`}></i>
          {playing ? 'Stop' : 'Play'}
        </button>

        <button
          onClick={recordReel}
          disabled={recording}
          className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cursor-pointer transition-all"
          style={{
            background: recording ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
            border: recording ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: recording ? '#f87171' : '#6b7280',
          }}>
          {recording
            ? <><i className="ri-record-circle-line text-lg animate-pulse"></i> Recording…</>
            : <><i className="ri-video-download-line text-lg"></i> Record & Save</>
          }
        </button>
      </div>

      <p className="text-[9px] text-gray-800 text-center mt-4 max-w-xs leading-relaxed">
        "Record & Save" will ask you to share your screen — select this tab, then the reel plays and downloads automatically as a .webm file.
      </p>
    </div>
  );
}
