"use client";

import { useEffect, useRef, useState } from "react";
import { getSharedBgAudio, getSharedBgGraph } from "@/lib/bgAudio";
import { VinylPlayer } from "./VinylPlayer";

const TARGET_VOLUME = 0.4;
const FADE_SECONDS = 0.7;

export function BackgroundMusic() {
  const pauseTimerRef = useRef<number | null>(null);
  /** UI 仅由 audio 的 play / pause 事件驱动 */
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = getSharedBgAudio();
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    setPlaying(!audio.paused);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function fadeGainTo(target: number) {
    const graph = getSharedBgGraph();
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
    const audio = getSharedBgAudio();
    const graph = getSharedBgGraph();
    if (!audio || !graph) return;

    void graph.context.resume();
    clearPauseTimer();

    if (!audio.paused) {
      fadeGainTo(0);
      pauseTimerRef.current = window.setTimeout(() => {
        audio.pause();
        pauseTimerRef.current = null;
      }, FADE_SECONDS * 1000);
      return;
    }

    fadeGainTo(TARGET_VOLUME);
    void audio.play().catch(() => {
      /* play 失败时 pause 事件会把 UI 拉回 */
    });
  }

  useEffect(
    () => () => {
      clearPauseTimer();
    },
    [],
  );

  return (
    <VinylPlayer
      playing={playing}
      onToggle={handleToggle}
      playLabel="播放音乐"
      pauseLabel="暂停音乐"
    />
  );
}
