import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { vertex, fragment } from './shaders/background';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useWebGLSupport } from '@/hooks/useWebGLSupport';

const BRAND_COLORS: [number, number, number][] = [
  [0.627, 0.788, 0.796], // #A0C9CB — Aqua Mist (2nd cool blob, balances the orange)
  [1.000, 0.376, 0.216], // #E65416 — Toxic Orange (the one warm blob)
  [1.000, 0.500, 0.350], // lighter Toxic Orange tint (unused blob, kept for parity)
  [0.627, 0.788, 0.796], // #A0C9CB — Aqua Mist
];

// WebGL background clipped to its containing hero card (absolutely positioned,
// not fixed to the viewport). Falls back to a static CSS gradient when WebGL is
// unavailable or the visitor prefers reduced motion; see usePrefersReducedMotion
// / useWebGLSupport for why those checks happen before any GL work starts.
export default function ShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const webglSupported = useWebGLSupport();
  const showFallback = reducedMotion || !webglSupported;

  useEffect(() => {
    if (showFallback) return;
    const container = containerRef.current;
    if (!container) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.5);

    const renderer = new Renderer({ dpr, alpha: false, antialias: false });
    const gl = renderer.gl;
    gl.clearColor(0.04, 0.04, 0.04, 1);
    container.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uOctaves: { value: isTouch ? 2 : 4 },
        uColor1: { value: BRAND_COLORS[0] },
        uColor2: { value: BRAND_COLORS[1] },
        uColor3: { value: BRAND_COLORS[2] },
        uColor4: { value: BRAND_COLORS[3] },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const mouse = { x: 0.5, y: 0.5 };
    const targetMouse = { x: 0.5, y: 0.5 };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
    };
    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouse.x = (e.clientX - rect.left) / rect.width;
      targetMouse.y = 1 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('pointermove', onPointerMove);

    let rafId = 0;
    let running = true;
    const start = performance.now();

    const loop = (now: number) => {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      // Ease mouse toward target — avoids a jittery/teleporting warp on fast moves.
      mouse.x += (targetMouse.x - mouse.x) * 0.08;
      mouse.y += (targetMouse.y - mouse.y) * 0.08;
      program.uniforms.uMouse.value = [mouse.x, mouse.y];
      program.uniforms.uTime.value = (now - start) / 1000;
      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(loop);

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!running) {
        running = true;
        rafId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (gl.canvas.parentElement === container) container.removeChild(gl.canvas);
    };
  }, [showFallback]);

  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={
          showFallback
            ? {
                background: 'linear-gradient(160deg, #0a0a0a 0%, #1a0f0a 35%, #111827 70%, #0d0d0d 100%)',
                backgroundSize: '200% 200%',
                animation: reducedMotion ? 'none' : 'gradient-shift 18s ease infinite',
              }
            : undefined
        }
        ref={containerRef}
      />
    </div>
  );
}
