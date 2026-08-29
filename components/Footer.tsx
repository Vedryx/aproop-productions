import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(20,20,20,.1)] bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-[clamp(18px,3vw,40px)] px-[clamp(20px,4vw,56px)] py-[clamp(28px,3vw,44px)]">
        <div className="flex h-[82px] w-[82px] flex-none items-center justify-center overflow-hidden">
          <Image
            src="/uploads/logo-big.png"
            alt="Aproop Production"
            width={200}
            height={162}
            className="block h-full w-auto flex-none object-contain"
            style={{ clipPath: "inset(0 11% 0 11%)", margin: "0 -10px" }}
          />
        </div>
        <span className="text-[11.5px] font-medium uppercase tracking-[0.24em] text-[#141414]">
          Ad Films · Documentaries · Short Films · Songs &amp; Jingles
        </span>
        <span className="ml-auto text-[11.5px] uppercase tracking-[0.2em] text-[rgba(20,20,20,.55)]">
          © 2025 Aproop Production
        </span>
        <a
          href="#top"
          className="inline-flex items-center gap-[9px] text-[11.5px] font-medium uppercase tracking-[0.22em] text-[#141414] transition-colors duration-300 hover:text-[#a8781c]"
        >
          Back to top{" "}
          <span
            className="inline-block"
            style={{ animation: "ap-nudge 2.4s ease-in-out infinite" }}
          >
            ↑
          </span>
        </a>
      </div>
    </footer>
  );
}
