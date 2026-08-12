import { useState } from 'react';

function probeWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return !!gl;
  } catch {
    return false;
  }
}

// Synchronous probe (getContext resolves immediately), so no "checking" state
// is needed — callers get a real answer on first render.
export function useWebGLSupport(): boolean {
  const [supported] = useState(probeWebGL2);
  return supported;
}
