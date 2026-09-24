"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  finalLetterContent,
  finalLetterCopy,
} from "@/data/finalLetter";
import FeatherPen, { TIP_OX, TIP_OY } from "./FeatherPen";
import styles from "./letter.module.css";

const { salutation, paragraphs, signature, date } = finalLetterContent;

type BlockDef = {
  id: string;
  text: string;
  variant: "salutation" | "body" | "signature" | "date";
};

function buildBlocks(): BlockDef[] {
  const list: BlockDef[] = [
    { id: "salutation", text: salutation, variant: "salutation" },
    ...paragraphs.map((text, i) => ({
      id: `p-${i}`,
      text,
      variant: "body" as const,
    })),
    { id: "signature", text: signature, variant: "signature" as const },
  ];
  if (date) list.push({ id: "date", text: date, variant: "date" });
  return list;
}

const BLOCKS = buildBlocks();

const CHAR_MS = 200;
const PEN_LERP = 0.28;
const PEN_BOB_PX = 1.4;
const PEN_BOB_HZ = 4;
const FLY_IN_MS = 400;
const HOLD_AFTER_MS = 500;
const FADE_OUT_MS = 400;
const DOUBLE_CLICK_MS = 280;
const USER_SCROLL_GRACE_MS = 1500;
/** 书写行相对视口顶部的目标位置 */
const FOLLOW_RATIO = 0.6;

type MobileMode = "unknown" | "desktop" | "mobile";
type PenMode = "hidden" | "flyingIn" | "writing" | "holding" | "fadingOut";
type TriggerSource = "viewport" | "callback" | "boot" | "resume";

const FALLING_STARS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${((i * 47) % 97) + 1.5}%`,
  size: 1 + (i % 3) * 0.5,
  duration: 14 + (i % 6) * 3.2,
  delay: (i % 9) * 1.7,
  opacity: 0.35 + (i % 4) * 0.1,
}));

function logWrite(
  msg: string,
  data: Record<string, unknown>,
) {
  const line = `[letter-write] ${msg} ${JSON.stringify(data)}`;
  console.log(`[letter-write] ${msg}`, data);
  if (typeof window !== "undefined") {
    const w = window as Window & { __letterLogs?: string[] };
    w.__letterLogs = w.__letterLogs ?? [];
    w.__letterLogs.push(line);
  }
}

function measureCharPoint(
  measureRoot: HTMLElement,
  contentRoot: HTMLElement,
  charIndex: number,
): { x: number; y: number } | null {
  const walker = document.createTreeWalker(
    measureRoot,
    NodeFilter.SHOW_TEXT,
  );
  let remaining = Math.max(0, charIndex);
  let textNode: Text | null = null;
  let offset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (remaining < node.length) {
      textNode = node;
      offset = remaining;
      break;
    }
    remaining -= node.length;
  }

  if (!textNode) {
    const fb = document.createTreeWalker(measureRoot, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    while (fb.nextNode()) last = fb.currentNode as Text;
    if (!last || last.length === 0) return null;
    textNode = last;
    offset = last.length;
  }

  const range = document.createRange();
  if (offset >= textNode.length) {
    range.setStart(textNode, Math.max(0, textNode.length - 1));
    range.setEnd(textNode, textNode.length);
  } else {
    let tryOffset = offset;
    while (
      tryOffset < textNode.length &&
      (textNode.data[tryOffset] === "\n" || textNode.data[tryOffset] === "\r")
    ) {
      tryOffset += 1;
    }
    if (tryOffset >= textNode.length) {
      range.setStart(textNode, Math.max(0, textNode.length - 1));
      range.setEnd(textNode, textNode.length);
    } else {
      range.setStart(textNode, tryOffset);
      range.setEnd(textNode, tryOffset + 1);
    }
  }

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const root = contentRoot.getBoundingClientRect();
  return {
    x: rect.left - root.left,
    y: rect.top - root.top + rect.height * 0.82,
  };
}

function afterLayout(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function InkChars({ text, revealed }: { text: string; revealed: number }) {
  const nodes: ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "\n") {
      nodes.push(<br key={`br-${i}`} />);
      continue;
    }
    nodes.push(
      <span
        key={i}
        className={`${styles.inkChar} ${i < revealed ? styles.inkOn : ""}`}
      >
        {ch}
      </span>,
    );
  }
  return <>{nodes}</>;
}

function blockClass(variant: BlockDef["variant"]) {
  switch (variant) {
    case "salutation":
      return styles.salutation;
    case "signature":
      return styles.signature;
    case "date":
      return styles.date;
    default:
      return styles.body;
  }
}

export default function LetterPage() {
  const [paperIn, setPaperIn] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mobileMode, setMobileMode] = useState<MobileMode>("unknown");
  /** 每块已写字数（仅 UI） */
  const [progress, setProgress] = useState<Record<string, number>>(() =>
    Object.fromEntries(BLOCKS.map((b) => [b.id, 0])),
  );
  /** 已解锁到的最大块下标（含）：后续块不占高度 */
  const [unlockedMax, setUnlockedMax] = useState(0);
  const [mobileShown, setMobileShown] = useState<Record<string, boolean>>({});
  const [penMode, setPenMode] = useState<PenMode>("hidden");
  const [penOpacity, setPenOpacity] = useState(0);
  const [skippedAll, setSkippedAll] = useState(false);
  /** UI 同步：当前书写块下标 */
  const [cursorIndex, setCursorIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<Record<string, HTMLElement | null>>({});
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const inkAnchorRefs = useRef<Record<string, HTMLElement | null>>({});
  const inViewRef = useRef<Record<string, boolean>>({});

  /** —— 全局唯一书写状态（refs，单循环驱动） —— */
  const bootGenRef = useRef(0);
  const cursorRef = useRef(0);
  const charRef = useRef(0);
  const progressRef = useRef(progress);
  const penModeRef = useRef<PenMode>("hidden");
  const skipAllRef = useRef(false);
  const pausedRef = useRef(false);
  const loopTimerRef = useRef(0);
  const holdTimerRef = useRef(0);
  const lerpRafRef = useRef(0);
  const flyRafRef = useRef(0);
  const followRafRef = useRef(0);
  const userScrollUntilRef = useRef(0);
  const ignoreScrollRef = useRef(false);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const penElRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef(0);
  const tryStartRef = useRef<
    ((source: TriggerSource) => void) | null
  >(null);
  const recalcPenRef = useRef<(() => void) | null>(null);

  progressRef.current = progress;
  penModeRef.current = penMode;

  const isMobile = mobileMode === "mobile";
  const usePen = !reduceMotion && mobileMode === "desktop" && !skippedAll;

  const applyPen = (x: number, y: number, bob: number) => {
    const el = penElRef.current;
    if (!el) return;
    // 笔尖锚点 (TIP_OX, TIP_OY) 对齐书写坐标；素材自带倾角，不 rotate
    el.style.transform = `translate3d(${x - TIP_OX}px, ${y - TIP_OY + bob}px, 0)`;
  };

  const recalcPenTarget = useCallback(() => {
    const bi = cursorRef.current;
    if (bi < 0 || bi >= BLOCKS.length) return;
    const block = BLOCKS[bi]!;
    const measure = measureRefs.current[block.id];
    const content = contentRef.current;
    if (!measure || !content) return;
    const count = charRef.current;
    const idx = Math.min(
      Math.max(0, count),
      Math.max(0, block.text.length - 1),
    );
    const point = measureCharPoint(measure, content, idx);
    if (point) targetPos.current = point;
  }, []);

  recalcPenRef.current = recalcPenTarget;

  /** 把当前书写行滚到视口 60% 处 */
  const followWritingLine = useCallback(() => {
    if (Date.now() < userScrollUntilRef.current) return;
    const scroll = scrollRef.current;
    const bi = cursorRef.current;
    if (!scroll || bi < 0 || bi >= BLOCKS.length) return;
    const block = BLOCKS[bi]!;
    const measure = measureRefs.current[block.id];
    const content = contentRef.current;
    if (!measure || !content) return;

    const idx = Math.min(
      charRef.current,
      Math.max(0, block.text.length - 1),
    );
    const point = measureCharPoint(measure, content, idx);
    if (!point) return;

    // point.y 相对 content；目标：该点落在 scroll 视口的 FOLLOW_RATIO 处
    const desired =
      point.y - scroll.clientHeight * FOLLOW_RATIO + scroll.offsetTop;
    // content 在 scroll 内，point.y 已是 content 内坐标
    const targetScroll = Math.max(
      0,
      Math.min(
        scroll.scrollHeight - scroll.clientHeight,
        point.y - scroll.clientHeight * FOLLOW_RATIO,
      ),
    );

    const from = scroll.scrollTop;
    const dist = targetScroll - from;
    if (Math.abs(dist) < 2) return;

    if (followRafRef.current) {
      window.cancelAnimationFrame(followRafRef.current);
    }
    ignoreScrollRef.current = true;
    const t0 = performance.now();
    const dur = 280;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - p) ** 2;
      scroll.scrollTop = from + dist * ease;
      if (p < 1) {
        followRafRef.current = window.requestAnimationFrame(step);
      } else {
        ignoreScrollRef.current = false;
        followRafRef.current = 0;
        recalcPenRef.current?.();
      }
    };
    followRafRef.current = window.requestAnimationFrame(step);
    void desired;
  }, []);

  // 笔 lerp
  useEffect(() => {
    if (
      !usePen ||
      (penMode !== "writing" && penMode !== "holding")
    ) {
      if (lerpRafRef.current) {
        window.cancelAnimationFrame(lerpRafRef.current);
        lerpRafRef.current = 0;
      }
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = targetPos.current;
      const c = currentPos.current;
      c.x += (t.x - c.x) * PEN_LERP;
      c.y += (t.y - c.y) * PEN_LERP;
      const bob =
        penModeRef.current === "writing"
          ? Math.sin(((now - t0) / 1000) * PEN_BOB_HZ * Math.PI * 2) *
            PEN_BOB_PX
          : 0;
      applyPen(c.x, c.y, bob);
      lerpRafRef.current = window.requestAnimationFrame(tick);
    };
    lerpRafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (lerpRafRef.current) {
        window.cancelAnimationFrame(lerpRafRef.current);
        lerpRafRef.current = 0;
      }
    };
  }, [usePen, penMode]);

  // scroll / resize → 重算笔尖
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const onScroll = () => {
      if (!ignoreScrollRef.current) {
        userScrollUntilRef.current = Date.now() + USER_SCROLL_GRACE_MS;
      }
      recalcPenRef.current?.();
    };
    const onResize = () => recalcPenRef.current?.();

    scroll.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [paperIn]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 手写体就绪后再启动书写（避免度量宽高突变）
  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setFontsReady(true);
    };

    const waitFonts = async () => {
      try {
        if (document.fonts?.load) {
          await document.fonts.load('400 17px "Ma Shan Zheng"');
        }
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        /* 加载失败时仍用兜底衬线继续 */
      }
      markReady();
    };

    void waitFonts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobileMode(mq.matches ? "mobile" : "desktop");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (mobileMode === "unknown") return;
    const raf = window.requestAnimationFrame(() => setPaperIn(true));
    if (reduceMotion) {
      const full: Record<string, number> = {};
      const shown: Record<string, boolean> = {};
      BLOCKS.forEach((b) => {
        full[b.id] = b.text.length;
        shown[b.id] = true;
      });
      setProgress(full);
      setMobileShown(shown);
      setUnlockedMax(BLOCKS.length - 1);
    }
    return () => window.cancelAnimationFrame(raf);
  }, [mobileMode, reduceMotion]);

  /**
   * 全局唯一书写循环（StrictMode：bootGen 防护）
   * 等 document.fonts.ready 后再启动，避免手写体換入后坐标偏移
   */
  useEffect(() => {
    if (!usePen || !paperIn || !fontsReady) return;

    const bootGen = ++bootGenRef.current;
    let disposed = false;
    const isStale = () => disposed || bootGen !== bootGenRef.current;

    logWrite("boot", { bootGen, cursor: cursorRef.current });

    const clearLoopTimer = () => {
      if (loopTimerRef.current) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = 0;
      }
    };

    const syncProgressUi = (blockId: string, count: number) => {
      if (isStale()) return;
      setProgress((prev) => {
        if (prev[blockId] === count) return prev;
        return { ...prev, [blockId]: count };
      });
      progressRef.current = {
        ...progressRef.current,
        [blockId]: count,
      };
    };

    const fadePenOut = (then?: () => void) => {
      if (isStale()) return;
      setPenMode("fadingOut");
      penModeRef.current = "fadingOut";
      const t0 = performance.now();
      const step = (now: number) => {
        if (isStale()) return;
        const p = Math.min(1, (now - t0) / FADE_OUT_MS);
        setPenOpacity(1 - p);
        if (p < 1) {
          flyRafRef.current = window.requestAnimationFrame(step);
        } else {
          setPenOpacity(0);
          setPenMode("hidden");
          penModeRef.current = "hidden";
          then?.();
        }
      };
      flyRafRef.current = window.requestAnimationFrame(step);
    };

    const flyPenIn = (onDone: () => void) => {
      if (isStale()) return;
      const content = contentRef.current;
      const bi = cursorRef.current;
      const block = BLOCKS[bi];
      if (!content || !block) {
        onDone();
        return;
      }
      setPenMode("flyingIn");
      penModeRef.current = "flyingIn";
      setPenOpacity(1);

      afterLayout(() => {
        if (isStale()) return;
        recalcPenTarget();
        const end = { ...targetPos.current };
        const start = {
          x: content.clientWidth + 36,
          y: end.y - 70,
        };
        currentPos.current = { ...start };
        applyPen(start.x, start.y, 0);
        const t0 = performance.now();
        const fly = (now: number) => {
          if (isStale() || skipAllRef.current) return;
          const p = Math.min(1, (now - t0) / FLY_IN_MS);
          const ease = 1 - (1 - p) ** 2;
          const arc = Math.sin(p * Math.PI) * 28;
          currentPos.current = {
            x: start.x + (end.x - start.x) * ease,
            y: start.y + (end.y - start.y) * ease - arc,
          };
          applyPen(currentPos.current.x, currentPos.current.y, 0);
          if (p < 1) {
            flyRafRef.current = window.requestAnimationFrame(fly);
          } else {
            currentPos.current = { ...end };
            targetPos.current = { ...end };
            onDone();
          }
        };
        flyRafRef.current = window.requestAnimationFrame(fly);
      });
    };

    /** 当前块是否在视口内（准入） */
    const isCurrentEligible = () => {
      const bi = cursorRef.current;
      if (bi < 0 || bi >= BLOCKS.length) return false;
      return !!inViewRef.current[BLOCKS[bi]!.id];
    };

    /** 书写目标是否滚出视口过远 → 暂停 */
    const isWritingLineVisible = () => {
      const scroll = scrollRef.current;
      const bi = cursorRef.current;
      if (!scroll || bi < 0 || bi >= BLOCKS.length) return false;
      const block = BLOCKS[bi]!;
      const measure = measureRefs.current[block.id];
      const content = contentRef.current;
      if (!measure || !content) return isCurrentEligible();
      const point = measureCharPoint(
        measure,
        content,
        Math.min(charRef.current, Math.max(0, block.text.length - 1)),
      );
      if (!point) return isCurrentEligible();
      const lineTop = point.y - scroll.scrollTop;
      const margin = scroll.clientHeight * 0.15;
      return lineTop >= -margin && lineTop <= scroll.clientHeight + margin;
    };

    const scheduleTick = () => {
      clearLoopTimer();
      if (isStale() || skipAllRef.current) return;
      loopTimerRef.current = window.setTimeout(runTick, CHAR_MS);
    };

    const finishCurrentBlock = () => {
      if (isStale()) return;
      const bi = cursorRef.current;
      const block = BLOCKS[bi];
      if (!block) return;
      charRef.current = block.text.length;
      syncProgressUi(block.id, block.text.length);
      setPenMode("holding");
      penModeRef.current = "holding";
      pausedRef.current = true;
      clearLoopTimer();

      logWrite("block done", {
        cursor: bi,
        chars: block.text.length,
        source: "callback",
      });

      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = 0;
        if (isStale() || skipAllRef.current) return;

        const next = bi + 1;
        fadePenOut(() => {
          if (isStale() || skipAllRef.current) return;
          if (next >= BLOCKS.length) {
            cursorRef.current = next;
            setCursorIndex(next);
            logWrite("all done", { cursor: next });
            return;
          }
          // 解锁下一块（严格顺序）
          cursorRef.current = next;
          charRef.current = progressRef.current[BLOCKS[next]!.id] ?? 0;
          setCursorIndex(next);
          setUnlockedMax((m) => Math.max(m, next));
          pausedRef.current = true;
          logWrite("advance cursor", {
            cursor: next,
            chars: charRef.current,
            source: "callback",
          });
          // 等布局后尝试启动（需准入）
          afterLayout(() => tryStart("callback"));
        });
      }, HOLD_AFTER_MS);
    };

    const runTick = () => {
      if (isStale() || skipAllRef.current) return;
      if (penModeRef.current !== "writing") return;
      if (pausedRef.current) return;

      const bi = cursorRef.current;
      if (bi < 0 || bi >= BLOCKS.length) return;
      const block = BLOCKS[bi]!;

      // 准入 + 行可见
      if (!isCurrentEligible() || !isWritingLineVisible()) {
        pausedRef.current = true;
        clearLoopTimer();
        logWrite("pause (out of view)", {
          cursor: bi,
          chars: charRef.current,
          source: "callback",
        });
        fadePenOut();
        return;
      }

      if (charRef.current >= block.text.length) {
        finishCurrentBlock();
        return;
      }

      charRef.current += 1;
      const next = charRef.current;
      syncProgressUi(block.id, next);

      logWrite("char", {
        cursor: bi,
        chars: next,
        source: "callback",
      });

      afterLayout(() => {
        if (isStale()) return;
        recalcPenTarget();
        followWritingLine();
      });

      if (next >= block.text.length) {
        finishCurrentBlock();
        return;
      }
      scheduleTick();
    };

    const tryStart = (source: TriggerSource) => {
      if (isStale() || skipAllRef.current) return;
      const bi = cursorRef.current;
      if (bi < 0 || bi >= BLOCKS.length) return;
      const block = BLOCKS[bi]!;

      // 严格顺序：只写 cursor，前面未完成不可能到这里
      if ((progressRef.current[block.id] ?? 0) >= block.text.length) {
        // 已完成则推进
        if (bi + 1 < BLOCKS.length) {
          cursorRef.current = bi + 1;
          setCursorIndex(bi + 1);
          setUnlockedMax((m) => Math.max(m, bi + 1));
          charRef.current = progressRef.current[BLOCKS[bi + 1]!.id] ?? 0;
          afterLayout(() => tryStart("callback"));
        }
        return;
      }

      if (!isCurrentEligible()) {
        logWrite("wait (not eligible)", {
          cursor: bi,
          chars: charRef.current,
          source,
        });
        return;
      }

      // 已在写
      if (
        penModeRef.current === "writing" ||
        penModeRef.current === "flyingIn"
      ) {
        pausedRef.current = false;
        return;
      }

      logWrite("start/resume", {
        cursor: bi,
        chars: charRef.current,
        source,
      });

      pausedRef.current = false;
      charRef.current = progressRef.current[block.id] ?? charRef.current;

      flyPenIn(() => {
        if (isStale() || skipAllRef.current) return;
        setPenMode("writing");
        penModeRef.current = "writing";
        followWritingLine();
        scheduleTick();
      });
    };

    tryStartRef.current = tryStart;

    // 初始：解锁块 0；首段默认准入（避免 ref/IO 竞态导致永不启动）
    setUnlockedMax((m) => Math.max(m, 0));
    afterLayout(() => {
      if (isStale()) return;
      const first = BLOCKS[0];
      if (first) {
        inViewRef.current[first.id] = true;
        const el = blockRefs.current[first.id];
        const root = scrollRef.current;
        if (el && root) {
          const er = el.getBoundingClientRect();
          const rr = root.getBoundingClientRect();
          const gate = rr.top + rr.height * 0.85;
          // 若首段确实远在门槛之下，才撤销默认准入
          if (er.top >= gate) {
            inViewRef.current[first.id] = false;
            logWrite("boot: first below gate", {
              cursor: 0,
              chars: 0,
              source: "boot",
              erTop: er.top,
              gate,
            });
          }
        }
      }
      tryStart("boot");
    });

    return () => {
      disposed = true;
      clearLoopTimer();
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = 0;
      }
      if (flyRafRef.current) {
        window.cancelAnimationFrame(flyRafRef.current);
        flyRafRef.current = 0;
      }
      if (followRafRef.current) {
        window.cancelAnimationFrame(followRafRef.current);
        followRafRef.current = 0;
      }
      logWrite("cleanup", { bootGen });
    };
  }, [usePen, paperIn, fontsReady, recalcPenTarget, followWritingLine]);

  // IntersectionObserver：仅更新准入；启动只针对 cursor
  useEffect(() => {
    if (mobileMode === "unknown" || reduceMotion) return;
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.blockId;
          if (!id) continue;
          const visible = entry.isIntersecting;
          inViewRef.current[id] = visible;

          if (isMobile) {
            if (visible) {
              setMobileShown((prev) =>
                prev[id] ? prev : { ...prev, [id]: true },
              );
            }
            continue;
          }

          if (skipAllRef.current) continue;

          const bi = cursorRef.current;
          const currentId = BLOCKS[bi]?.id;
          if (id !== currentId) {
            // 后面的段进入视口：只记准入，绝不启动
            if (visible) {
              logWrite("viewport hit (ignored, not cursor)", {
                cursor: bi,
                hitId: id,
                chars: charRef.current,
                source: "viewport",
              });
            }
            continue;
          }

          if (visible) {
            tryStartRef.current?.("viewport");
          } else if (
            penModeRef.current === "writing" ||
            penModeRef.current === "holding"
          ) {
            pausedRef.current = true;
            if (loopTimerRef.current) {
              window.clearTimeout(loopTimerRef.current);
              loopTimerRef.current = 0;
            }
            logWrite("viewport left → pause", {
              cursor: bi,
              chars: charRef.current,
              source: "viewport",
            });
          }
        }
      },
      {
        root,
        rootMargin: "0px 0px -15% 0px",
        threshold: 0.01,
      },
    );

    BLOCKS.forEach((b, i) => {
      if (i > unlockedMax) return;
      const el = blockRefs.current[b.id];
      if (el) observer.observe(el);
    });

    // observe 后主动再试一次当前 cursor（IO 首帧可能晚于 boot）
    afterLayout(() => {
      const bi = cursorRef.current;
      const id = BLOCKS[bi]?.id;
      if (id && inViewRef.current[id]) {
        tryStartRef.current?.("viewport");
      }
    });

    return () => observer.disconnect();
  }, [mobileMode, reduceMotion, isMobile, paperIn, unlockedMax]);

  // 移动端：按顺序解锁淡入（同样等字体就绪）
  useEffect(() => {
    if (!isMobile || reduceMotion || !paperIn || !fontsReady) return;
    let i = 0;
    const timers: number[] = [];
    const showNext = () => {
      if (i >= BLOCKS.length) return;
      const b = BLOCKS[i]!;
      setMobileShown((prev) => ({ ...prev, [b.id]: true }));
      setProgress((prev) => ({ ...prev, [b.id]: b.text.length }));
      setUnlockedMax(i);
      i += 1;
      timers.push(window.setTimeout(showNext, 600));
    };
    timers.push(window.setTimeout(showNext, 400));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isMobile, reduceMotion, paperIn, fontsReady]);

  useEffect(
    () => () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      if (lerpRafRef.current) window.cancelAnimationFrame(lerpRafRef.current);
    },
    [],
  );

  function completeCurrentBlock() {
    const bi = cursorRef.current;
    if (bi < 0 || bi >= BLOCKS.length) return;
    const block = BLOCKS[bi]!;
    charRef.current = block.text.length;
    setProgress((prev) => ({ ...prev, [block.id]: block.text.length }));
    progressRef.current = {
      ...progressRef.current,
      [block.id]: block.text.length,
    };
    // 触发 finish：通过 tryStart 路径不够；直接推进
    pausedRef.current = true;
    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = 0;
    }
    // 复用循环内逻辑：模拟写完
    setPenMode("holding");
    penModeRef.current = "holding";
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = 0;
      const next = bi + 1;
      setPenMode("fadingOut");
      penModeRef.current = "fadingOut";
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / FADE_OUT_MS);
        setPenOpacity(1 - p);
        if (p < 1) {
          flyRafRef.current = window.requestAnimationFrame(step);
        } else {
          setPenOpacity(0);
          setPenMode("hidden");
          penModeRef.current = "hidden";
          if (next >= BLOCKS.length) {
            cursorRef.current = next;
            setCursorIndex(next);
            return;
          }
          cursorRef.current = next;
          charRef.current = 0;
          setCursorIndex(next);
          setUnlockedMax((m) => Math.max(m, next));
          afterLayout(() => tryStartRef.current?.("callback"));
        }
      };
      flyRafRef.current = window.requestAnimationFrame(step);
    }, HOLD_AFTER_MS);
  }

  function completeAll() {
    skipAllRef.current = true;
    setSkippedAll(true);
    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = 0;
    }
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = 0;
    }
    if (flyRafRef.current) {
      window.cancelAnimationFrame(flyRafRef.current);
      flyRafRef.current = 0;
    }
    const full: Record<string, number> = {};
    BLOCKS.forEach((b) => {
      full[b.id] = b.text.length;
    });
    setProgress(full);
    progressRef.current = full;
    setUnlockedMax(BLOCKS.length - 1);
    cursorRef.current = BLOCKS.length;
    setCursorIndex(BLOCKS.length);

    const content = contentRef.current;
    const start = { ...currentPos.current };
    const end = {
      x: (content?.clientWidth ?? 400) + 50,
      y: start.y - 90,
    };
    setPenMode("fadingOut");
    penModeRef.current = "fadingOut";
    const t0 = performance.now();
    const fly = (now: number) => {
      const p = Math.min(1, (now - t0) / 560);
      const ease = p * p;
      const arc = Math.sin(p * Math.PI) * 40;
      currentPos.current = {
        x: start.x + (end.x - start.x) * ease,
        y: start.y + (end.y - start.y) * ease - arc,
      };
      applyPen(currentPos.current.x, currentPos.current.y, 0);
      setPenOpacity(1 - p);
      if (p < 1) {
        flyRafRef.current = window.requestAnimationFrame(fly);
      } else {
        setPenOpacity(0);
        setPenMode("hidden");
        penModeRef.current = "hidden";
      }
    };
    if (penMode !== "hidden") {
      flyRafRef.current = window.requestAnimationFrame(fly);
    }
  }

  function onScreenClick() {
    if (reduceMotion || isMobile || skippedAll) return;

    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = 0;
      completeAll();
      return;
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = 0;
      completeCurrentBlock();
    }, DOUBLE_CLICK_MS);
  }

  const particleNodes = useMemo(
    () =>
      FALLING_STARS.map((s) => (
        <span
          key={s.id}
          className={styles.particle}
          style={{
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      )),
    [],
  );

  const showPen = usePen && penMode !== "hidden";

  return (
    <main
      className={`${styles.page} safe-px`}
      onClick={onScreenClick}
      role="presentation"
    >
      <div className={styles.particles} aria-hidden>
        {particleNodes}
      </div>

      <div className={styles.stage}>
        <div className={styles.moonHalo} aria-hidden />

        <article
          className={`${styles.paper} ${styles.paperHug}${
            paperIn ? ` ${styles.paperIn}` : ""
          }`}
          aria-label={finalLetterCopy.title}
          data-cursor={cursorIndex}
        >
          <div className={styles.paperGrain} aria-hidden />
          <div ref={scrollRef} className={styles.paperScroll}>
            <div ref={contentRef} className={styles.letterContent}>
              {BLOCKS.map((block, i) => {
                if (i > unlockedMax) return null;
                const revealed = progress[block.id] ?? 0;
                const done = revealed >= block.text.length;
                const mobileOn = !!mobileShown[block.id] || reduceMotion;
                const isClosing =
                  block.variant === "signature" || block.variant === "date";

                return (
                  <div
                    key={block.id}
                    ref={(el) => {
                      blockRefs.current[block.id] = el;
                    }}
                    data-block-id={block.id}
                    className={`${styles.writeBlock}${
                      isClosing ? ` ${styles.writeBlockClosing}` : ""
                    }${
                      isMobile || reduceMotion
                        ? ` ${styles.reveal} ${mobileOn ? styles.revealOn : ""}`
                        : ""
                    }`}
                  >
                    <div
                      ref={(el) => {
                        measureRefs.current[block.id] = el;
                      }}
                      className={styles.measureLayer}
                      aria-hidden
                    >
                      <p className={blockClass(block.variant)}>{block.text}</p>
                    </div>

                    <div
                      ref={(el) => {
                        inkAnchorRefs.current[block.id] = el;
                      }}
                      className={styles.inkLayer}
                    >
                      <p className={blockClass(block.variant)}>
                        {isMobile || reduceMotion ? (
                          mobileOn || done ? (
                            block.text
                          ) : null
                        ) : (
                          <InkChars text={block.text} revealed={revealed} />
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}

              {showPen ? (
                <div
                  ref={penElRef}
                  className={styles.pen}
                  style={{ opacity: penOpacity }}
                  aria-hidden
                >
                  <FeatherPen />
                </div>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
