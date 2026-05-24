import { useState, useRef } from 'react';

const API_KEY = import.meta.env.VITE_REPLICATE_API_KEY as string;

// ─── Script scenes ─────────────────────────────────────────────────────────────

const SCENES = [
  {
    id: 1,
    title: 'The Chaos',
    timing: '0–3s',
    prompt:
      'Multiple app windows open simultaneously on a dark desktop, notification badges piling up, spreadsheet with red error cells, Slack messages flooding in, Google Forms, email inbox overflowing, overwhelming cluttered digital workspace, cinematic dark moody lighting, fast chaotic energy, 9:16 vertical video, high quality',
  },
  {
    id: 2,
    title: 'The Break',
    timing: '3–5s',
    prompt:
      'All windows dissolving and shattering into pure black, dramatic slow motion, particles of light fading away, complete darkness, single beat of silence, cinematic minimalist, dark background, 9:16 vertical video, high quality',
  },
  {
    id: 3,
    title: 'The Hub Reveals',
    timing: '5–10s',
    prompt:
      'Sleek dark modern software dashboard rising up from the bottom of the screen, glowing orange accent colors, clean UI with sidebar navigation, team attendance dots lighting up green one by one, KPI cards counting up, beautiful data visualization, cinematic product reveal, dark background with orange glow, slow camera push forward, 9:16 vertical video, high quality',
  },
  {
    id: 4,
    title: 'Features Montage',
    timing: '10–15s',
    prompt:
      'Rapid elegant transitions between dark UI screens: attendance tracking view with green checkmarks, payroll processing screen with numbers calculating and processed stamp appearing, document vault with files organizing, credentials panel with masked passwords locking into place, each screen morphing into the next, dark premium software aesthetic, orange accent colors, 9:16 vertical video, high quality',
  },
  {
    id: 5,
    title: 'The Stamp',
    timing: '15–17s',
    prompt:
      'Single dark cinematic frame, clean minimal dark background with subtle warm glow, dramatic pause, dark premium aesthetic, 9:16 vertical video, high quality',
  },
  {
    id: 6,
    title: 'The Hero Glow',
    timing: '17–20s',
    prompt:
      'Dramatic cinematic reveal of large bold white glowing text on pure dark background, warm golden orange glow radiating outward from the letters, light breathing and pulsing, text illuminated from within, luxury brand reveal, dark film noir aesthetic, warm amber and orange light bloom, 9:16 vertical video, high quality, slow motion',
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type ClipStatus = 'idle' | 'generating' | 'done' | 'error';

interface ClipState {
  status: ClipStatus;
  videoUrl?: string;
  error?: string;
  predictionId?: string;
}

// ─── Replicate API ─────────────────────────────────────────────────────────────

async function createPrediction(prompt: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/models/minimax/video-01/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt,
        duration: 5,
        aspect_ratio: '9:16',
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
}

async function pollPrediction(id: string, onProgress?: (pct: number) => void): Promise<string> {
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json() as { status: string; output?: string | string[]; error?: string; logs?: string };

    if (data.status === 'succeeded') {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) throw new Error('No output returned');
      return out;
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || 'Generation failed');
    }
    // estimate rough progress from logs or attempt count
    if (onProgress) onProgress(Math.min(attempt / 40, 0.9));
  }
  throw new Error('Timed out waiting for video');
}

// ─── Scene card ────────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  clip,
  onGenerate,
}: {
  scene: typeof SCENES[0];
  clip: ClipState;
  onGenerate: (id: number, prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState(scene.prompt);
  const [progress, setProgress] = useState(0);

  const handleGenerate = () => {
    setProgress(0);
    onGenerate(scene.id, prompt);
  };

  const statusColor = {
    idle: 'rgba(255,255,255,0.06)',
    generating: 'rgba(255,107,53,0.1)',
    done: 'rgba(34,197,94,0.08)',
    error: 'rgba(239,68,68,0.08)',
  }[clip.status];

  const statusBorder = {
    idle: 'rgba(255,255,255,0.08)',
    generating: 'rgba(255,107,53,0.25)',
    done: 'rgba(34,197,94,0.2)',
    error: 'rgba(239,68,68,0.2)',
  }[clip.status];

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ background: statusColor, border: `1px solid ${statusBorder}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
            style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35' }}>
            {scene.id}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{scene.title}</p>
            <p className="text-[10px] text-gray-600">{scene.timing}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {clip.status === 'done' && (
            <a href={clip.videoUrl} download={`scene-${scene.id}.mp4`}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
              style={{ color: '#22c55e' }}>
              <i className="ri-download-2-line text-base"></i>
            </a>
          )}
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
            clip.status === 'idle'       ? 'text-gray-700 bg-white/5' :
            clip.status === 'generating' ? 'text-orange-400 bg-orange-500/10' :
            clip.status === 'done'       ? 'text-green-400 bg-green-500/10' :
                                           'text-red-400 bg-red-500/10'
          }`}>
            {clip.status === 'generating' ? 'Generating…' : clip.status}
          </span>
        </div>
      </div>

      {/* Prompt */}
      <div className="px-5 pb-4">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          className="w-full text-xs text-gray-500 leading-relaxed rounded-xl px-3 py-2.5 resize-none focus:outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </div>

      {/* Progress bar */}
      {clip.status === 'generating' && (
        <div className="px-5 pb-3">
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #FF6B35, #f97316)' }} />
          </div>
          <p className="text-[9px] text-gray-700 mt-1">This takes ~60–90s per clip…</p>
        </div>
      )}

      {/* Video result */}
      {clip.status === 'done' && clip.videoUrl && (
        <div className="px-5 pb-4">
          <video src={clip.videoUrl} controls className="w-full rounded-xl" style={{ maxHeight: 280 }} />
        </div>
      )}

      {/* Error */}
      {clip.status === 'error' && (
        <div className="px-5 pb-4">
          <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{clip.error}</p>
        </div>
      )}

      {/* Generate button */}
      <div className="px-5 pb-5">
        <button
          onClick={handleGenerate}
          disabled={clip.status === 'generating'}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          style={{
            background: clip.status === 'generating' ? 'rgba(255,255,255,0.04)' : 'rgba(255,107,53,0.15)',
            border: `1px solid ${clip.status === 'generating' ? 'rgba(255,255,255,0.06)' : 'rgba(255,107,53,0.3)'}`,
            color: clip.status === 'generating' ? '#4b5563' : '#FF6B35',
          }}>
          {clip.status === 'generating'
            ? 'Generating…'
            : clip.status === 'done'
            ? 'Regenerate'
            : 'Generate Clip'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AiVideoPage() {
  const [clips, setClips] = useState<Record<number, ClipState>>(
    Object.fromEntries(SCENES.map(s => [s.id, { status: 'idle' as ClipStatus }]))
  );
  const progressRefs = useRef<Record<number, (pct: number) => void>>({});

  const setClip = (id: number, update: Partial<ClipState>) =>
    setClips(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));

  const generateClip = async (id: number, prompt: string) => {
    setClip(id, { status: 'generating', videoUrl: undefined, error: undefined });

    // Store progress setter reference
    const updateProgress = (pct: number) => {
      setClips(prev => {
        if (prev[id].status !== 'generating') return prev;
        // We don't store progress in state to avoid re-renders — just update the bar via ref
        return prev;
      });
    };
    progressRefs.current[id] = updateProgress;

    try {
      const predictionId = await createPrediction(prompt);
      setClip(id, { predictionId });
      const videoUrl = await pollPrediction(predictionId, updateProgress);
      setClip(id, { status: 'done', videoUrl });
    } catch (err) {
      setClip(id, { status: 'error', error: String(err) });
    }
  };

  const generateAll = () => {
    SCENES.forEach((scene, i) => {
      setTimeout(() => generateClip(scene.id, scene.prompt), i * 2000);
    });
  };

  const doneCount = Object.values(clips).filter(c => c.status === 'done').length;
  const generatingCount = Object.values(clips).filter(c => c.status === 'generating').length;

  return (
    <div className="min-h-screen bg-[#030305] text-white px-4 py-10 font-sans">
      <style>{`@import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');`}</style>

      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">Sentro OS · AI Video</p>
          <h1 className="text-2xl font-black text-white mb-1">20s Reel Generator</h1>
          <p className="text-sm text-gray-600">6 scenes · powered by Minimax via Replicate</p>
        </div>

        {/* Progress overview */}
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xl font-black text-white">{doneCount}<span className="text-gray-600 font-normal text-sm">/{SCENES.length}</span></p>
              <p className="text-[10px] text-gray-700">clips ready</p>
            </div>
            {generatingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-xs text-orange-400">{generatingCount} generating</span>
              </div>
            )}
          </div>
          <button
            onClick={generateAll}
            disabled={generatingCount > 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
            style={{
              background: generatingCount > 0 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #FF6B35, #e55a27)',
              color: generatingCount > 0 ? '#4b5563' : '#fff',
              boxShadow: generatingCount > 0 ? 'none' : '0 0 20px rgba(255,107,53,0.35)',
            }}>
            {generatingCount > 0 ? 'Generating…' : 'Generate All'}
          </button>
        </div>

        {/* Scenes */}
        <div className="flex flex-col gap-4">
          {SCENES.map(scene => (
            <SceneCard
              key={scene.id}
              scene={scene}
              clip={clips[scene.id]}
              onGenerate={generateClip}
            />
          ))}
        </div>

        {/* Assembly note */}
        {doneCount > 0 && (
          <div className="mt-8 rounded-2xl p-4 text-center"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <p className="text-xs text-green-400 font-semibold mb-1">{doneCount} clip{doneCount > 1 ? 's' : ''} ready</p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              Download each clip and assemble in CapCut, Premiere, or DaVinci Resolve.<br />
              Add the SENTRO OS text overlay on Scene 6 for the glowing hero ending.
            </p>
          </div>
        )}

        <p className="text-[9px] text-gray-800 text-center mt-8">
          Each clip ~60–90s to generate · billed to your Replicate account
        </p>
      </div>
    </div>
  );
}
