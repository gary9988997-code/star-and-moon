"use client";

import { useRef, useState } from "react";
import { homeConfig } from "@/data/config";

const MUSIC_SRC = "/music/bg.mp3";
const TARGET_VOLUME = 0.4;
const FADE_SECONDS = 0.7;

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(homeConfig.music.defaultOn);

  function ensureAudioGraph() {
    const audio = audioRef.current;
    if (!audio) return null;

    if (!contextRef.current || !gainRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return null;

      const context = new AudioContextClass();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(context.destination);
      contextRef.current = context;
      gainRef.current = gain;
    }

    return { context: contextRef.current, gain: gainRef.current };
  }

  function fadeGainTo(target: number) {
    const graph = ensureAudioGraph();
    if (!graph) return;
    const now = graph.context.currentTime;
    graph.gain.gain.cancelScheduledValues(now);
    graph.gain.gain.setValueAtTime(graph.gain.gain.value, now);
    graph.gain.gain.linearRampToValueAtTime(target, now + FADE_SECONDS);
  }

  function clearPauseTimer() {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }

  function handleToggle() {
    const audio = audioRef.current;
    const graph = ensureAudioGraph();
    if (!audio || !graph) return;

    // 必须在同一次点击里解锁，iOS 才允许出声
    void graph.context.resume();
    clearPauseTimer();

    if (playing) {
      fadeGainTo(0);
      setPlaying(false);
      pauseTimerRef.current = window.setTimeout(() => {
        audio.pause();
        pauseTimerRef.current = null;
      }, FADE_SECONDS * 1000);
      return;
    }

    const playPromise = audio.play();
    fadeGainTo(TARGET_VOLUME);
    setPlaying(true);
    void playPromise.catch(() => {
      setPlaying(false);
    });
  }

  const label = playing
    ? homeConfig.music.pauseLabel
    : homeConfig.music.playLabel;

  return (
    <>
      <audio
        ref={audioRef}
        src={MUSIC_SRC}
        loop
        preload="none"
        playsInline
        className="hidden"
      />
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={playing}
        aria-label={label}
        className="fixed right-5 top-5 z-50 rounded-full border border-primary/40 bg-space-deep/40 px-3 py-1.5 text-xs text-primary-light backdrop-blur-sm transition hover:border-moon-gold/50 hover:text-moon-gold sm:right-8 sm:top-8 landscape:top-14"
      >
        {label}
      </button>
    </>
  );
}
