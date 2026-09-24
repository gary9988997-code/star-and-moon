"use client";

import { useEffect, useRef } from "react";
import styles from "./VinylPlayer.module.css";

type VinylPlayerProps = {
  playing: boolean;
  onToggle: () => void;
  playLabel?: string;
  pauseLabel?: string;
  className?: string;
};

function readRotationDeg(el: HTMLElement): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  try {
    const m = new DOMMatrixReadOnly(t);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  } catch {
    return 0;
  }
}

export function VinylPlayer({
  playing,
  onToggle,
  playLabel = "播放音乐",
  pauseLabel = "暂停音乐",
  className = "",
}: VinylPlayerProps) {
  const diskRef = useRef<HTMLDivElement>(null);
  const coastAngleRef = useRef(0);
  const label = playing ? pauseLabel : playLabel;

  useEffect(() => {
    const disk = diskRef.current;
    if (!disk) return;

    if (playing) {
      disk.style.transition = "none";
      disk.style.transform = `rotate(${coastAngleRef.current}deg)`;
      void disk.offsetWidth;
      disk.style.transform = "";
      disk.classList.add(styles.diskSpinning);
      return;
    }

    disk.classList.remove(styles.diskSpinning);
    const angle = readRotationDeg(disk);
    coastAngleRef.current = angle + 48;
    disk.style.transition = "none";
    disk.style.transform = `rotate(${angle}deg)`;
    void disk.offsetWidth;
    disk.style.transition = "transform 1s ease-out";
    disk.style.transform = `rotate(${coastAngleRef.current}deg)`;
  }, [playing]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={playing}
      aria-label={label}
      title={label}
      className={`${styles.player} ${className}`}
    >
      <span className={styles.stage} aria-hidden>
        <span ref={diskRef} className={styles.disk}>
          <span className={styles.grooves} />
          <span className={styles.gleam} />
          <span className={styles.label} />
        </span>
        <span
          className={`${styles.tonearm}${
            playing ? ` ${styles.tonearmDown}` : ""
          }`}
        >
          <span className={styles.tonearmPivot} />
          <span className={styles.tonearmBar} />
          <span className={styles.tonearmHead} />
        </span>
      </span>
    </button>
  );
}
