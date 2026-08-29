import Image from "next/image";
import Link from "next/link";

export default function ProducerHeader() {
  return (
    <header
      id="top"
      className="sticky top-0 z-50 border-b border-[rgba(20,20,20,.1)] bg-white shadow-[0_1px_24px_rgba(0,0,0,.18)]"
    >
      <div className="mx-auto flex h-[78px] max-w-[1320px] items-center gap-[clamp(16px,3vw,48px)] px-[clamp(20px,4vw,56px)]">
        <Link
          href="/"
          aria-label="Aproop Production — home"
          className="flex h-[70px] w-[70px] flex-none items-center justify-center overflow-hidden"
        >
          <Image
            src="/uploads/logo-big.png"
            alt="Aproop Production"
            width={200}
            height={162}
            priority
            className="block h-full w-auto flex-none object-contain"
            style={{ clipPath: "inset(0 11% 0 11%)", margin: "0 -9px" }}
          />
        </Link>

        <span className="text-[12px] font-medium uppercase tracking-[0.26em] text-[#141414]">
          Be the producer
        </span>

        <Link
          href="/#producer"
          className="ml-auto flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.22em] text-[#141414] transition-colors duration-300 hover:text-[#a8781c]"
        >
          <span className="text-sm">↖</span> Back to the studio
        </Link>
      </div>
    </header>
  );
}
