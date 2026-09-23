import dynamic from "next/dynamic";

const ClientLetters = dynamic(() => import("./ClientLetters"), {
  ssr: false,
  loading: () => (
    <main
      className="relative z-10 min-h-dvh overflow-hidden"
      style={{ backgroundColor: "var(--bg-deep)" }}
    >
      <div className="min-h-[50vh] w-full" aria-hidden />
    </main>
  ),
});

/** 月光信局：强制客户端渲染，避免 Hydration 不一致 */
export default function LettersPage() {
  return <ClientLetters />;
}
