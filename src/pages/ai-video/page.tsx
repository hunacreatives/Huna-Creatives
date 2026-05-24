import { useState, useRef } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const API_KEY = import.meta.env.VITE_REPLICATE_API_KEY as string;

// ─── Script scenes ─────────────────────────────────────────────────────────────

const SCENES = [
  {
    id: 1,
    title: 'The Chaos',
    timing: '0–5s',
    prompt:
      'Multiple app windows open simultaneously on a dark desktop, notification badges piling up, spreadsheet with red error cells, Slack messages flooding in, email inbox overflowing, overwhelming cluttered digital workspace, cinematic dark moody lighting, chaotic energy, 9:16 vertical video, high quality, 5 seconds',
  },
  {
    id: 2,
    title: 'The Hub Reveals',
    timing: '5–10s',
    prompt:
      'Sleek dark modern software dashboard rising up dramatically from the bottom of the screen, glowing orange accent colors, clean UI sidebar navigation, team attendance dots lighting up green, KPI stat cards animating, cinematic product reveal, dark background with orange glow, slow camera push forward, 9:16 vertical video, high quality, 5 seconds',
  },
  {
    id: 3,
    title: 'Features Montage',
    timing: '10–15s',
    prompt:
      'Rapid elegant transitions between dark software UI screens: attendance tracking with green checkmarks filling in, payroll processing with numbers calculating and a green processed stamp, document vault with files organizing themselves, credentials panel locking into place, each screen morphing into the next seamlessly, dark premium software aesthetic, orange accents, 9:16 vertical video, high quality, 5 seconds',
  },
  {
    id: 4,
    title: 'The Stamp',
    timing: '15–20s',
    prompt:
      'Cinematic dark frame, single line of clean bold white text fading in centered on screen, warm amber light softly illuminating from behind, minimal dramatic pause, premium dark brand aesthetic, subtle warm glow particles floating, 9:16 vertical video, high quality, 5 seconds',
  },
  {
    id: 5,
    title: 'The Hero Glow',
    timing: '20–25s',
    prompt:
      'Dramatic cinematic reveal of large glowing bold white text on pure black background, warm golden orange light radiating and blooming outward from the letters, glow breathing and pulsing like neon signage, text illuminated from within, luxury brand reveal, dark film noir aesthetic, warm amber and orange light bloom filling the frame, 9:16 vertical video, high quality, 5 seconds',
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

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function testConnection(): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/account', { headers: HEADERS });
  if (!res.ok) throw new Error(`Auth failed: HTTP ${res.status}`);
  const data = await res.json() as { username?: string };
  return data.username ?? 'connected';
}

async function createPrediction(prompt: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/models/minimax/video-01/predictions', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      input: { prompt, prompt_optimizer: true },
    }),
  });
  const data = await res.json() as { id?: string; detail?: string; error?: string };
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  if (!data.id) throw new Error('No prediction ID returned');
  return data.id;
}

async function pollPrediction(id: string, onProgress?: (status: string) => void): Promise<string> {
  for (let attempt = 0; attempt < 180; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: HEADERS });
    const data = await res.json() as { status: string; output?: string | string[]; error?: string; logs?: string };

    if (onProgress) onProgress(data.status);

    if (data.status === 'succeeded') {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) throw new Error('No output returned');
      return out;
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || `Prediction ${data.status}`);
    }
  }
  throw new Error('Timed out after 9 minutes');
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
          <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
            <div className="h-full rounded-full animate-pulse"
              style={{ width: clip.predictionId ? '60%' : '15%', background: 'linear-gradient(90deg, #FF6B35, #f97316)', transition: 'width 1s ease' }} />
          </div>
          <p className="text-[9px] text-orange-500/70 font-mono">
            {clip.predictionId
              ? (clip.error?.startsWith('Replicate:') ? clip.error : `Replicate: processing… (~2–3 min)`)
              : 'Sending to Replicate…'}
          </p>
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

type StitchStatus = 'idle' | 'loading-ffmpeg' | 'stitching' | 'done' | 'error';

export default function AiVideoPage() {
  const [clips, setClips] = useState<Record<number, ClipState>>(
    Object.fromEntries(SCENES.map(s => [s.id, { status: 'idle' as ClipStatus }]))
  );
  const progressRefs = useRef<Record<number, (pct: number) => void>>({});
  const [stitchStatus, setStitchStatus] = useState<StitchStatus>('idle');
  const [stitchProgress, setStitchProgress] = useState('');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const ffmpegRef = useRef<ReturnType<typeof createFFmpeg> | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const setClip = (id: number, update: Partial<ClipState>) =>
    setClips(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));

  const runTest = async () => {
    setTestResult('Testing…');
    try {
      const username = await testConnection();
      setTestResult(`✓ Connected as @${username}`);
    } catch (err) {
      setTestResult(`✗ ${String(err)}`);
    }
  };

  const generateClip = async (id: number, prompt: string) => {
    setClip(id, { status: 'generating', videoUrl: undefined, error: undefined, predictionId: undefined });
    try {
      const predictionId = await createPrediction(prompt);
      setClip(id, { predictionId });
      const videoUrl = await pollPrediction(predictionId, (status) => {
        setClip(id, { predictionId, status: 'generating', error: undefined, videoUrl: undefined });
        // store live status in error field temporarily for display
        setClips(prev => ({ ...prev, [id]: { ...prev[id], error: `Replicate: ${status}…` } }));
      });
      setClip(id, { status: 'done', videoUrl, error: undefined });
    } catch (err) {
      setClip(id, { status: 'error', error: String(err) });
    }
  };

  const generateAll = () => {
    SCENES.forEach((scene, i) => {
      setTimeout(() => generateClip(scene.id, scene.prompt), i * 2000);
    });
  };

  const stitchAll = async () => {
    const readyClips = SCENES.map(s => clips[s.id]).filter(c => c.status === 'done' && c.videoUrl);
    if (readyClips.length === 0) return;

    try {
      // Load ffmpeg if not already loaded
      if (!ffmpegRef.current) {
        setStitchStatus('loading-ffmpeg');
        setStitchProgress('Loading ffmpeg…');
        const ff = createFFmpeg({
          corePath: `${window.location.origin}/ffmpeg/ffmpeg-core.js`,
          log: false,
        });
        ff.setLogger(({ message }) => setStitchProgress(message));
        ff.setProgress(({ ratio }) => setStitchProgress(`Encoding… ${Math.round(ratio * 100)}%`));
        await ff.load();
        ffmpegRef.current = ff;
      }

      setStitchStatus('stitching');
      const ff = ffmpegRef.current!;

      // Write each clip to ffmpeg virtual FS
      const listLines: string[] = [];
      for (let i = 0; i < readyClips.length; i++) {
        setStitchProgress(`Fetching clip ${i + 1} of ${readyClips.length}…`);
        const filename = `clip${i}.mp4`;
        ff.FS('writeFile', filename, await fetchFile(readyClips[i].videoUrl!));
        listLines.push(`file '${filename}'`);
      }

      // Write concat list
      ff.FS('writeFile', 'list.txt', new TextEncoder().encode(listLines.join('\n')));

      setStitchProgress('Stitching clips together…');
      await ff.run('-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp4');

      setStitchProgress('Exporting…');
      const data = ff.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setFinalVideoUrl(url);
      setStitchStatus('done');
    } catch (err) {
      setStitchStatus('error');
      setStitchProgress(String(err));
    }
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
          <h1 className="text-2xl font-black text-white mb-1">25s Reel Generator</h1>
          <p className="text-sm text-gray-600">5 scenes · 5s each · powered by Minimax via Replicate</p>
        </div>

        {/* Connection test */}
        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-xs font-semibold text-gray-400">Replicate connection</p>
            {testResult && (
              <p className={`text-[11px] mt-0.5 font-mono ${testResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {testResult}
              </p>
            )}
          </div>
          <button onClick={runTest}
            className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
            Test API
          </button>
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

        {/* Stitch panel */}
        {doneCount > 0 && (
          <div className="mt-8 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-bold text-white">Combine into one video</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {doneCount}/{SCENES.length} clips ready · runs in your browser
                </p>
              </div>
              <button
                onClick={stitchAll}
                disabled={stitchStatus === 'loading-ffmpeg' || stitchStatus === 'stitching'}
                className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2"
                style={{
                  background: (stitchStatus === 'loading-ffmpeg' || stitchStatus === 'stitching')
                    ? 'rgba(255,255,255,0.04)'
                    : 'linear-gradient(135deg, #FF6B35, #e55a27)',
                  color: (stitchStatus === 'loading-ffmpeg' || stitchStatus === 'stitching') ? '#4b5563' : '#fff',
                  boxShadow: (stitchStatus === 'loading-ffmpeg' || stitchStatus === 'stitching') ? 'none' : '0 0 20px rgba(255,107,53,0.35)',
                }}>
                {stitchStatus === 'loading-ffmpeg' || stitchStatus === 'stitching'
                  ? <><i className="ri-loader-4-line animate-spin"></i> Working…</>
                  : stitchStatus === 'done'
                  ? <><i className="ri-refresh-line"></i> Re-stitch</>
                  : <><i className="ri-scissors-cut-line"></i> Stitch & Export</>
                }
              </button>
            </div>

            {/* Progress */}
            {(stitchStatus === 'loading-ffmpeg' || stitchStatus === 'stitching') && stitchProgress && (
              <div className="px-5 py-3">
                <p className="text-[10px] text-orange-400 font-mono truncate">{stitchProgress}</p>
              </div>
            )}

            {/* Error */}
            {stitchStatus === 'error' && (
              <div className="px-5 py-3">
                <p className="text-xs text-red-400">{stitchProgress}</p>
              </div>
            )}

            {/* Final video */}
            {stitchStatus === 'done' && finalVideoUrl && (
              <div className="px-5 pb-5 pt-4">
                <video src={finalVideoUrl} controls className="w-full rounded-xl mb-3"
                  style={{ maxHeight: 400, background: '#000' }} />
                <a href={finalVideoUrl} download="sentro-os-reel.mp4"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                  <i className="ri-download-2-line text-base"></i>
                  Download sentro-os-reel.mp4
                </a>
              </div>
            )}
          </div>
        )}

        <p className="text-[9px] text-gray-800 text-center mt-8">
          Each clip ~60–90s to generate · billed to your Replicate account
        </p>
      </div>
    </div>
  );
}
