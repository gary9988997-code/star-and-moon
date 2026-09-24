"use client";

/**
 * 全站背景音乐单例：模块级 Audio + Web Audio 图，跨路由 / StrictMode 共享。
 */
const MUSIC_SRC = "/music/bg.mp3";

let sharedAudio: HTMLAudioElement | null = null;
let sharedContext: AudioContext | null = null;
let sharedGain: GainNode | null = null;
let sourceWired = false;

export function getSharedBgAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(MUSIC_SRC);
    sharedAudio.loop = true;
    sharedAudio.preload = "none";
    sharedAudio.setAttribute("playsinline", "true");
  }
  return sharedAudio;
}

export function getSharedBgGraph(): {
  context: AudioContext;
  gain: GainNode;
} | null {
  const audio = getSharedBgAudio();
  if (!audio) return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedContext) {
    sharedContext = new AudioContextClass();
  }

  if (!sourceWired) {
    const source = sharedContext.createMediaElementSource(audio);
    sharedGain = sharedContext.createGain();
    sharedGain.gain.value = 0;
    source.connect(sharedGain);
    sharedGain.connect(sharedContext.destination);
    sourceWired = true;
  }

  if (!sharedGain) return null;
  return { context: sharedContext, gain: sharedGain };
}
