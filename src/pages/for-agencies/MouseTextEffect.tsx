import { useRef, useEffect, useCallback, useMemo, useState } from 'react';

interface Props {
  text: string;
  copies?: number;
  textColor?: string;
  shadowColor?: string;
  glowStartColor?: string;
  glowEndColor?: string;
  useGradientGlow?: boolean;
  shadowScaleFactor?: number;
  fontSize?: string | number;
  fontFamily?: string;
  fontWeight?: number;
  glowBlur?: number;
  glowOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

function parseColor(input: string) {
  if (!input) return { r: 255, g: 255, b: 255 };
  if (input.startsWith('rgb')) {
    const match = input.match(/rgba?\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map(Number);
      return { r: parts[0] || 255, g: parts[1] || 255, b: parts[2] || 255 };
    }
  } else if (input.startsWith('#')) {
    let c = input.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    c = c.slice(0, 6).padStart(6, '0');
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function lerpColor(a: {r:number;g:number;b:number}, b: {r:number;g:number;b:number}, t: number) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

// Inject CSS once
function injectStyle() {
  if (typeof window === 'undefined') return;
  if (document.getElementById('mouse-text-shadow-style')) return;
  const style = document.createElement('style');
  style.id = 'mouse-text-shadow-style';
  style.innerHTML = `
    .mts-copy {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%)
        translate(
          calc(var(--index, 1) * var(--horizontal, 1) * 0.1rem),
          calc(var(--index, 1) * var(--vertical, 1) * 0.1rem)
        )
        scale(calc(1 + var(--index, 1) * var(--shadow-scale, 0.01)));
      color: var(--shadow-color);
      filter: blur(0.1rem);
      user-select: none;
      white-space: pre;
      text-align: center;
      font-family: inherit;
      font-size: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      line-height: inherit;
      will-change: transform;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export default function MouseTextEffect({
  text,
  copies = 100,
  textColor = '#FFFFFF',
  shadowColor = '#FF6B35',
  glowStartColor = '#FF6B35',
  glowEndColor = '#ff2200',
  useGradientGlow = true,
  shadowScaleFactor = 0.01,
  fontSize,
  fontFamily = 'inherit',
  fontWeight = 900,
  glowBlur = 32,
  glowOpacity = 1,
  className = '',
  style = {},
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const centerAnimRef = useRef<number>(0);
  const [direction, setDirection] = useState({ horizontal: 1, vertical: 1 });

  useEffect(() => { injectStyle(); }, []);

  const shadowRGB = parseColor(shadowColor);
  const startRGB = parseColor(glowStartColor);
  const endRGB = parseColor(glowEndColor);

  const shadowColorStrings = useMemo(() => {
    const arr: string[] = [];
    for (let i = 1; i <= copies; i++) {
      const rgb = useGradientGlow
        ? lerpColor(startRGB, endRGB, (i - 1) / (copies - 1))
        : shadowRGB;
      arr.push(`rgba(${rgb.r},${rgb.g},${rgb.b},${1 / i})`);
    }
    return arr;
  }, [copies, useGradientGlow]);

  const shadowCopies = useMemo(() => {
    return Array.from({ length: copies }, (_, i) => (
      <div
        key={i + 1}
        aria-hidden="true"
        className="mts-copy"
        style={{ '--index': i + 1, '--shadow-color': shadowColorStrings[i] } as React.CSSProperties}
      >
        {text}
      </div>
    ));
  }, [copies, text, shadowColorStrings]);

  const handlePointer = useCallback((e: MouseEvent | TouchEvent) => {
    if (centerAnimRef.current) cancelAnimationFrame(centerAnimRef.current);
    const rect = containerRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let horizontal = x > rect.width / 2
      ? (x - rect.width / 2) / (rect.width / 2) * -1
      : (rect.width / 2 - x) / (rect.width / 2);
    let vertical = y > rect.height / 2
      ? (y - rect.height / 2) / (rect.height / 2) * -1
      : (rect.height / 2 - y) / (rect.height / 2);
    horizontal = Math.max(-1, Math.min(1, horizontal));
    vertical = Math.max(-1, Math.min(1, vertical));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setDirection({ horizontal, vertical }));
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (centerAnimRef.current) cancelAnimationFrame(centerAnimRef.current);
    function animateBack() {
      setDirection(prev => {
        const speed = 0.18;
        const h = prev.horizontal + (1 - prev.horizontal) * speed;
        const v = prev.vertical + (1 - prev.vertical) * speed;
        if (Math.abs(h - 1) < 0.01 && Math.abs(v - 1) < 0.01) return { horizontal: 1, vertical: 1 };
        centerAnimRef.current = requestAnimationFrame(animateBack);
        return { horizontal: h, vertical: v };
      });
    }
    centerAnimRef.current = requestAnimationFrame(animateBack);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handlePointer as EventListener);
    el.addEventListener('touchmove', handlePointer as EventListener);
    el.addEventListener('mouseleave', handlePointerLeave);
    el.addEventListener('touchend', handlePointerLeave);
    return () => {
      el.removeEventListener('mousemove', handlePointer as EventListener);
      el.removeEventListener('touchmove', handlePointer as EventListener);
      el.removeEventListener('mouseleave', handlePointerLeave);
      el.removeEventListener('touchend', handlePointerLeave);
    };
  }, [handlePointer, handlePointerLeave]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.setProperty('--horizontal', String(direction.horizontal));
    containerRef.current.style.setProperty('--vertical', String(direction.vertical));
  }, [direction]);

  const glowRGB = parseColor(useGradientGlow ? glowStartColor : shadowColor);
  const glowColorStr = `rgba(${glowRGB.r},${glowRGB.g},${glowRGB.b},${glowOpacity})`;
  const fs = typeof fontSize === 'number' ? fontSize : parseInt(String(fontSize)) || 160;
  const go = 0.7 * (fs / 160);
  const x1 = direction.horizontal * go, y1 = direction.vertical * go;
  const x2 = direction.horizontal * go * 2, y2 = direction.vertical * go * 2;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-visible select-none ${className}`}
      style={{
        '--horizontal': direction.horizontal,
        '--vertical': direction.vertical,
        '--shadow-scale': shadowScaleFactor,
        fontFamily,
        fontSize,
        fontWeight,
        ...style,
      } as React.CSSProperties}
    >
      {shadowCopies}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          color: textColor,
          userSelect: 'none',
          whiteSpace: 'pre',
          textAlign: 'center',
          pointerEvents: 'auto',
          textShadow: `${x1}px ${y1}px ${glowBlur}px ${glowColorStr}, ${x2}px ${y2}px ${glowBlur * 2}px ${glowColorStr}`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
