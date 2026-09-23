"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { gateConfig } from "@/data/config";

type Meteor = {
  id: number;
  top: number;
  duration: number;
};

type GateStar = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
};

const PIN_LENGTH = 4;

function buildGateStars(count: number): GateStar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 47 + 13) % 100}%`,
    top: `${(i * 31 + 7) % 100}%`,
    size: 0.7 + (i % 3) * 0.55,
    delay: (i % 9) * 0.35,
    duration: 2.4 + (i % 6) * 0.55,
  }));
}

function RevealQuestion({ text }: { text: string }) {
  return (
    <p className="gate-question font-display text-center text-sm leading-relaxed tracking-wide text-[#F8F5FF]/92 sm:text-base sm:leading-7">
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.45,
            delay: 0.35 + index * 0.045,
            ease: "easeOut",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </p>
  );
}

export default function ClientGate() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const verifyingRef = useRef(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const gateStars = useMemo(
    () => buildGateStars(isMobile ? 22 : 42),
    [isMobile],
  );

  const focusHiddenInput = useCallback(() => {
    if (success) return;
    inputRef.current?.focus();
  }, [success]);

  const verifyPin = useCallback(
    (pin: string) => {
      if (verifyingRef.current || success) return;
      verifyingRef.current = true;

      if (pin === gateConfig.password) {
        setError("");
        setSuccess(true);
        window.setTimeout(() => {
          router.push(gateConfig.successRedirect);
        }, 800);
        return;
      }

      setSuccess(false);
      setError(gateConfig.errorMessage);
      setShake(true);
      window.setTimeout(() => {
        setShake(false);
        setAnswer("");
        verifyingRef.current = false;
        inputRef.current?.focus();
      }, 520);
    },
    [router, success],
  );

  function handlePinChange(event: ChangeEvent<HTMLInputElement>) {
    if (success || verifyingRef.current) return;
    const digits = event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setAnswer(digits);
    if (error) setError("");

    if (digits.length === PIN_LENGTH) {
      window.setTimeout(() => verifyPin(digits), 80);
    }
  }

  function handlePinKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && answer.length === PIN_LENGTH) {
      event.preventDefault();
      verifyPin(answer);
    }
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let nextId = 0;
    let activeCount = 0;
    let timer: number | undefined;

    function spawnLoop() {
      // 桌面 8～15s；手机略疏一些，减轻负担
      const wait = isMobile
        ? 11000 + Math.random() * 7000
        : 8000 + Math.random() * 7000;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (activeCount < 2) {
          const id = ++nextId;
          const duration = isMobile
            ? 1.05 + Math.random() * 0.45
            : 1.2 + Math.random() * 0.75;
          activeCount += 1;
          setMeteors((prev) => [
            ...prev,
            { id, top: 4 + Math.random() * 42, duration },
          ]);
          window.setTimeout(() => {
            activeCount = Math.max(0, activeCount - 1);
            setMeteors((prev) => prev.filter((m) => m.id !== id));
          }, duration * 1000 + 80);
        }
        spawnLoop();
      }, wait);
    }

    spawnLoop();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [isMobile]);

  const filled = answer.length;
  const pinError = Boolean(error) && !success;

  return (
    <main className="gate-page relative z-10 flex min-h-dvh items-center justify-center overflow-hidden safe-px safe-py">
      <style>{`
        .gate-page {
          isolation: isolate;
        }
        .gate-sky {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .gate-nebula {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse 55% 40% at 18% 28%, rgba(139, 92, 246, 0.18), transparent 70%),
            radial-gradient(ellipse 45% 35% at 82% 22%, rgba(167, 139, 250, 0.14), transparent 68%),
            radial-gradient(ellipse 50% 42% at 72% 78%, rgba(88, 28, 135, 0.2), transparent 72%),
            radial-gradient(ellipse 40% 30% at 28% 82%, rgba(251, 191, 36, 0.06), transparent 70%),
            radial-gradient(ellipse 70% 55% at 50% 48%, rgba(26, 16, 61, 0.55), transparent 75%);
        }
        /* grok-shooting-stars 风格：缓慢旋转的星空 */
        .gate-starfield {
          pointer-events: none;
          position: absolute;
          inset: -18%;
          animation: gate-sky-rotate 140s linear infinite;
          will-change: transform;
        }
        .gate-star {
          position: absolute;
          border-radius: 9999px;
          background: #f8f5ff;
          box-shadow: 0 0 4px rgba(216, 180, 254, 0.55);
          animation-name: gate-star-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes gate-sky-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gate-star-twinkle {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.95; }
        }
        @media (max-width: 639px) {
          .gate-starfield {
            animation-duration: 200s;
          }
        }
        .gate-moon-orbit {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: clamp(180px, 11vw, 280px);
          margin: 0.85rem 0 0.35rem;
          flex-shrink: 0;
          background: transparent;
        }
        .gate-moon {
          display: block;
          width: 100%;
          height: auto;
          background: transparent;
          border: none;
          box-shadow: none;
          user-select: none;
          pointer-events: none;
          animation: gate-moon-float 5s ease-in-out infinite;
        }
        @keyframes gate-moon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .gate-constellation {
          pointer-events: none;
          position: absolute;
          z-index: 1;
          width: 140px;
          height: 140px;
          animation: gate-constellation-breathe 6.5s ease-in-out infinite;
        }
        .gate-constellation img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.55;
          mix-blend-mode: screen;
          filter: blur(0.5px) drop-shadow(0 0 12px rgba(167, 139, 250, 0.8));
          pointer-events: none;
          user-select: none;
        }
        .gate-stage {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: min(100%, 84rem);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gate-core {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 22rem;
          text-align: center;
        }
        .gate-question {
          margin-top: 1.75rem;
          max-width: 18rem;
        }
        /* 主体垂直居中后，星座略下移并保持错落 */
        .gate-constellation.is-cancer {
          left: 0;
          top: 58%;
          transform: translateY(calc(-50% + 48px));
        }
        .gate-constellation.is-libra {
          right: 0;
          top: 58%;
          transform: translateY(calc(-50% - 48px));
          animation-delay: -3.2s;
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .gate-stage {
            padding-left: 300px;
            padding-right: 300px;
          }
          .gate-constellation {
            width: 280px;
            height: 280px;
          }
          .gate-constellation.is-cancer {
            top: 56%;
            transform: translateY(calc(-50% + 44px));
          }
          .gate-constellation.is-libra {
            top: 56%;
            transform: translateY(calc(-50% - 44px));
          }
        }
        @media (min-width: 1024px) {
          .gate-stage {
            padding-left: 380px;
            padding-right: 380px;
          }
          .gate-constellation {
            width: 340px;
            height: 340px;
          }
          .gate-constellation.is-cancer {
            top: 56%;
            transform: translateY(calc(-50% + 56px));
          }
          .gate-constellation.is-libra {
            top: 56%;
            transform: translateY(calc(-50% - 56px));
          }
        }
        @media (min-width: 1280px) {
          .gate-stage {
            padding-left: 420px;
            padding-right: 420px;
          }
          .gate-constellation {
            width: 380px;
            height: 380px;
          }
          .gate-constellation.is-cancer {
            top: 55%;
            transform: translateY(calc(-50% + 64px));
          }
          .gate-constellation.is-libra {
            top: 55%;
            transform: translateY(calc(-50% - 64px));
          }
        }
        @media (max-width: 639px) {
          .gate-stage {
            padding-left: 0;
            padding-right: 0;
            max-width: 100%;
          }
          .gate-core {
            max-width: 17.5rem;
            padding-inline: 4.5rem;
          }
          .gate-constellation {
            width: 118px;
            height: 118px;
          }
          .gate-constellation.is-cancer {
            left: 0;
            right: auto;
            top: 62%;
            transform: translateY(calc(-50% + 36px));
          }
          .gate-constellation.is-libra {
            left: auto;
            right: 0;
            top: 62%;
            bottom: auto;
            transform: translateY(calc(-50% - 36px));
          }
        }
        @keyframes gate-constellation-breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.75; }
        }
        .gate-meteor {
          pointer-events: none;
          position: absolute;
          right: -4%;
          width: 130px;
          height: 8px;
          background: transparent;
          transform-origin: right center;
          animation-name: gate-meteor-fly;
          animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          animation-fill-mode: forwards;
          z-index: 1;
        }
        /* 拖尾：前端更宽更亮，向后收窄淡出（轨迹向左下，左端为最前端） */
        .gate-meteor::before {
          content: "";
          position: absolute;
          left: 3px;
          top: 50%;
          width: calc(100% - 3px);
          height: 100%;
          transform: translateY(-50%);
          background: linear-gradient(
            90deg,
            rgba(196, 181, 253, 0.75) 0%,
            rgba(167, 139, 250, 0.4) 32%,
            rgba(139, 92, 246, 0.12) 68%,
            transparent 100%
          );
          clip-path: polygon(0% 22%, 100% 46%, 100% 54%, 0% 78%);
          pointer-events: none;
        }
        /* 锐利头部光点：运动最前端 */
        .gate-meteor::after {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 50% 50%,
            #ffffff 0%,
            #ffffff 38%,
            #c4b5fd 72%,
            transparent 100%
          );
          box-shadow:
            0 0 8px rgba(255, 255, 255, 0.9),
            0 0 16px rgba(167, 139, 250, 0.6);
          transform: translate(-35%, -50%);
          pointer-events: none;
        }
        @keyframes gate-meteor-fly {
          0% {
            transform: translate(0, 0) rotate(-38deg);
            opacity: 0;
          }
          8% { opacity: 1; }
          75% { opacity: 1; }
          100% {
            transform: translate(-78vw, 62vh) rotate(-38deg);
            opacity: 0;
          }
        }
        .gate-pin-wrap {
          position: relative;
          margin-top: 1.75rem;
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .gate-pin-dots {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 4px;
          cursor: text;
        }
        .gate-pin-dots.is-shake {
          animation: gate-pin-shake 0.48s ease;
        }
        @keyframes gate-pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
        }
        .gate-pin-dot {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          border: 1.5px solid rgba(216, 207, 255, 0.85);
          background: transparent;
          box-shadow: 0 0 10px rgba(167, 139, 250, 0.2);
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .gate-pin-dot.is-filled {
          background: rgba(248, 245, 255, 0.95);
          border-color: rgba(248, 245, 255, 0.95);
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.55);
        }
        .gate-pin-dot.is-error {
          border-color: rgba(244, 114, 182, 0.95);
          box-shadow: 0 0 12px rgba(244, 114, 182, 0.45);
        }
        .gate-pin-dot.is-error.is-filled {
          background: rgba(244, 114, 182, 0.9);
          border-color: rgba(244, 114, 182, 0.95);
        }
        .gate-pin-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          border: 0;
          padding: 0;
          margin: 0;
          caret-color: transparent;
          color: transparent;
          background: transparent;
          font-size: 16px; /* iOS 避免自动放大 */
          letter-spacing: 0;
          z-index: 2;
        }
      `}</style>

      <div className="gate-sky" aria-hidden>
        <div className="gate-nebula" />
        <div className="gate-starfield">
          {gateStars.map((star) => (
            <span
              key={star.id}
              className="gate-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>
        {meteors.map((meteor) => (
          <span
            key={meteor.id}
            className="gate-meteor"
            style={{
              top: `${meteor.top}%`,
              animationDuration: `${meteor.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="gate-stage">
        <div className="gate-constellation is-cancer" aria-hidden>
          <img
            src="/images/cancer-outline.png"
            alt=""
            draggable={false}
          />
        </div>
        <div className="gate-constellation is-libra" aria-hidden>
          <img
            src="/images/libra-outline.png"
            alt=""
            draggable={false}
          />
        </div>

        <div className="gate-core">
          <div className="gate-moon-orbit" aria-hidden>
            <img
              className="gate-moon"
              src="/images/cutemoon.png"
              alt=""
              draggable={false}
            />
          </div>
          <RevealQuestion text={gateConfig.question} />

          <div className="gate-pin-wrap">
            <div
              className={`gate-pin-dots${shake || pinError ? " is-shake" : ""}`}
              onClick={focusHiddenInput}
              role="presentation"
            >
              {Array.from({ length: PIN_LENGTH }).map((_, index) => {
                const isFilled = index < filled;
                return (
                  <span
                    key={index}
                    className={`gate-pin-dot${isFilled ? " is-filled" : ""}${pinError ? " is-error" : ""}`}
                    aria-hidden
                  />
                );
              })}
            </div>
            <input
              ref={inputRef}
              id="gate-answer"
              className="gate-pin-input"
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={PIN_LENGTH}
              value={answer}
              onChange={handlePinChange}
              onKeyDown={handlePinKeyDown}
              disabled={success}
              aria-label="四位数字密码"
            />
          </div>

          {error ? (
            <p className="mt-3 text-center text-sm text-rose-gold" role="alert">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="mt-3 text-center text-sm text-moon-gold" role="status">
              {gateConfig.successMessage}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
