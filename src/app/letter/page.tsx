"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  finalLetterBody,
  finalLetterCopy,
  finalRevealLines,
} from "@/data/finalLetter";
import MoonPhase from "./moon-phase";
import styles from "./letter.module.css";

const BODY_LENGTH = finalLetterBody.length;

const PUNCTUATION = new Set([
  "，",
  "。",
  "！",
  "？",
  "；",
  "：",
  "、",
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
  "…",
  "—",
  "～",
]);

function delayForChar(char: string, baseMs: number, reduceMotion: boolean) {
  if (reduceMotion) return 0;
  if (char === "\n") return baseMs + 300 + Math.floor(Math.random() * 201);
  if (PUNCTUATION.has(char)) {
    return baseMs + 120 + Math.floor(Math.random() * 61);
  }
  return baseMs;
}

type Stage = "typing" | "button" | "burst" | "reveal" | "done";

export default function LetterPage() {
  const [typedCount, setTypedCount] = useState(0);
  const [stage, setStage] = useState<Stage>("typing");
  const [buttonVisible, setButtonVisible] = useState(false);
  const [buttonLeaving, setButtonLeaving] = useState(false);
  const [moonBright, setMoonBright] = useState(false);
  const [burstOn, setBurstOn] = useState(false);
  const [line1On, setLine1On] = useState(false);
  const [line2On, setLine2On] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const timersRef = useRef<number[]>([]);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const stickToBottomRef = useRef(true);
  const scrollRafRef = useRef(0);

  const typingDone = typedCount >= BODY_LENGTH;
  const typedText = finalLetterBody.slice(0, typedCount);
  const moonProgress = BODY_LENGTH > 0 ? typedCount / BODY_LENGTH : 1;

  const line1 = finalRevealLines[0] ?? "";
  const line2 = finalRevealLines[1] ?? "";

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const isNearBottom = (el: HTMLElement) => {
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    return gap < 56;
  };

  const scrollBodyToBottom = () => {
    if (scrollRafRef.current) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = bodyRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!reduceMotion || typingDone) return;
    setTypedCount(BODY_LENGTH);
  }, [reduceMotion, typingDone]);

  useEffect(() => {
    if (stage !== "typing") return;
    if (typingDone) return;
    if (reduceMotion) return;

    const lastChar =
      typedCount > 0 ? (finalLetterBody[typedCount - 1] ?? "") : "";
    const wait =
      typedCount === 0
        ? finalLetterCopy.typeIntervalMs
        : delayForChar(lastChar, finalLetterCopy.typeIntervalMs, false);

    const id = window.setTimeout(() => {
      setTypedCount((prev) => Math.min(BODY_LENGTH, prev + 1));
    }, wait);

    return () => window.clearTimeout(id);
  }, [typedCount, typingDone, stage, reduceMotion]);

  // 打字自动跟随：仅在贴近底部时滚动
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollBodyToBottom();
  }, [typedCount]);

  useEffect(() => {
    if (!typingDone) return;
    stickToBottomRef.current = true;
    scrollBodyToBottom();
  }, [typingDone]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom(el);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [stage]);

  useEffect(() => {
    if (!typingDone || stage !== "typing") return;
    const delay = reduceMotion ? 200 : 500;
    const id = window.setTimeout(() => {
      setStage("button");
    }, delay);
    return () => window.clearTimeout(id);
  }, [typingDone, stage, reduceMotion]);

  useEffect(() => {
    if (stage !== "button") {
      setButtonVisible(false);
      return;
    }
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setButtonVisible(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [stage]);

  useEffect(
    () => () => {
      clearTimers();
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    },
    [],
  );

  const showLetterBody =
    stage === "typing" || stage === "button" || stage === "burst";
  const showButton = stage === "button" || stage === "burst";
  const showReveal = stage === "reveal" || stage === "done";
  const showBack = stage === "done";

  const moonClass = useMemo(
    () => `${styles.moonWrap}${moonBright ? ` ${styles.moonBright}` : ""}`,
    [moonBright],
  );

  function handleProveClick() {
    if (stage !== "button") return;
    setButtonLeaving(true);
    setStage("burst");
    setMoonBright(true);
    setBurstOn(true);

    const fadeMs = reduceMotion ? 200 : 420;
    const burstMs = reduceMotion ? 350 : 850;

    schedule(() => {
      setMoonBright(false);
    }, fadeMs);

    schedule(() => {
      setBurstOn(false);
      setStage("reveal");
      setLine1On(true);

      schedule(() => {
        setLine2On(true);
        schedule(() => {
          setStage("done");
        }, reduceMotion ? 400 : 1000);
      }, reduceMotion ? 200 : 800);
    }, burstMs);
  }

  return (
    <main className={`${styles.page} safe-px safe-py`}>
      <h1
        className={`${styles.title} font-display text-xl text-moon-gold sm:text-2xl`}
      >
        {finalLetterCopy.title}
      </h1>

      <div className={moonClass}>
        <MoonPhase progress={typingDone ? 1 : moonProgress} />
      </div>

      <div className={styles.stage}>
        {showLetterBody ? (
          <>
            <div className={styles.bodyShell}>
              <p
                ref={bodyRef}
                className={`${styles.body} text-sm leading-relaxed text-[var(--text)]/90 sm:text-base`}
              >
                {typedText}
                {!typingDone ? (
                  <span className={styles.cursor} aria-hidden />
                ) : null}
              </p>
            </div>

            {showButton ? (
              <button
                type="button"
                className={`${styles.button}${
                  buttonLeaving
                    ? ` ${styles.buttonLeaving}`
                    : buttonVisible
                      ? ` ${styles.buttonVisible}`
                      : ""
                }`}
                onClick={handleProveClick}
              >
                {finalLetterCopy.openButton}
              </button>
            ) : null}
          </>
        ) : null}

        {showReveal ? (
          <div className={styles.reveal}>
            <p
              className={`font-display ${styles.revealLine} ${styles.revealLinePrimary}${
                line1On ? ` ${styles.revealLineVisible}` : ""
              }`}
            >
              {line1}
            </p>
            <p
              className={`font-display ${styles.revealLine} ${styles.revealLineSecondary}${
                line2On ? ` ${styles.revealLineVisible}` : ""
              }`}
            >
              {line2}
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={`${styles.burst}${burstOn ? ` ${styles.burstActive}` : ""}`}
        aria-hidden
      />

      <Link
        href={finalLetterCopy.homeHref}
        className={`${styles.backLink}${
          showBack ? ` ${styles.backLinkVisible}` : ""
        } text-sm text-primary-light underline-offset-4 hover:text-moon-gold hover:underline`}
        tabIndex={showBack ? 0 : -1}
        aria-hidden={!showBack}
      >
        {finalLetterCopy.backHome}
      </Link>
    </main>
  );
}
