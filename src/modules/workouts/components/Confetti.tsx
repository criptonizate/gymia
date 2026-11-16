"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
};

const COLORS = ["#f97316", "#fbbf24", "#22c55e", "#3b82f6", "#a855f7", "#ef4444"];

/** Confetti canvas. Se auto-oculta a los `durationMs`. */
export function Confetti({
  trigger,
  durationMs = 2500,
}: {
  trigger: number | string | boolean;
  durationMs?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = (c.width = window.innerWidth * dpr);
    let h = (c.height = window.innerHeight * dpr);
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    const onResize = () => {
      w = c.width = window.innerWidth * dpr;
      h = c.height = window.innerHeight * dpr;
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", onResize);

    const n = 120;
    const parts: Particle[] = Array.from({ length: n }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (now - start < durationMs) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [trigger, durationMs]);

  if (!trigger) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden
    />
  );
}
