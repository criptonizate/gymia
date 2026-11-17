"use client";

import { useEffect, useState } from "react";
import { youtubeEmbedUrl } from "@/modules/exercises/youtube";

type Props = {
  videoId: string;
  title?: string;
};

export function YoutubePreview({ videoId, title }: Props) {
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const initialFrames = [
    `https://i.ytimg.com/vi/${videoId}/hq1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hq2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hq3.jpg`,
  ];
  const [frames, setFrames] = useState(initialFrames);
  const [frame, setFrame] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  function onImgError(i: number) {
    setFrames((prev) => {
      if (prev[i] === fallback) return prev;
      const next = [...prev];
      next[i] = fallback;
      return next;
    });
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 650);
    return () => window.clearInterval(id);
  }, [reducedMotion, frames.length]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {frames.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={title ? `${title} preview` : "Vista previa"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              i === frame ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => onImgError(i)}
          />
        ))}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Preview
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-video">
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={title ?? "YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
