import dynamic from "next/dynamic";

const ClientGate = dynamic(() => import("./ClientGate"), {
  ssr: false,
  loading: () => (
    <main className="relative z-10 flex min-h-dvh items-center justify-center safe-px safe-py">
      <div className="min-h-[50vh] w-full" aria-hidden />
    </main>
  ),
});

/** 月光之门：强制客户端渲染，避免 Hydration 不一致 */
export default function GatePage() {
  return <ClientGate />;
}
