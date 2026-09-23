import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题色 → CSS 变量
        "bg-deep": "var(--bg-deep)",
        "bg-deep-2": "var(--bg-deep-2)",
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
        },
        "moon-gold": "var(--moon-gold)",
        "rose-gold": "var(--rose-gold)",
        text: "var(--text)",

        // 既有语义 token，统一指向主题变量（页面无需改 class）
        space: {
          deep: "var(--bg-deep)",
          navy: "var(--bg-deep-2)",
          mist: "var(--bg-deep-2)",
        },
        cosmos: {
          purple: "var(--primary)",
          violet: "var(--primary)",
          soft: "var(--primary-light)",
        },
        moon: {
          gold: "var(--moon-gold)",
          glow: "var(--moon-gold)",
          pale: "var(--rose-gold)",
        },
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Noto Serif SC",
          "思源宋体",
          "Songti SC",
          "serif",
        ],
        body: [
          "var(--font-body)",
          "Noto Sans SC",
          "思源黑体",
          "Microsoft YaHei",
          "sans-serif",
        ],
        accent: [
          "var(--font-accent)",
          "var(--font-display)",
          "Noto Serif SC",
          "思源宋体",
          "Songti SC",
          "serif",
        ],
      },
      backgroundImage: {
        "space-gradient":
          "radial-gradient(ellipse 130% 100% at 50% 25%, var(--bg-deep-2) 0%, var(--bg-deep) 70%)",
        "moon-glow":
          "radial-gradient(circle, color-mix(in srgb, var(--moon-gold) 28%, transparent) 0%, transparent 70%)",
      },
      screens: {
        landscape: { raw: "(orientation: landscape) and (max-height: 500px)" },
      },
      animation: {
        twinkle: "twinkle 3s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
