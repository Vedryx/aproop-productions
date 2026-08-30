import Image from "next/image";
import BackToTop from "@/components/ui/BackToTop";

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(20,20,20,.1)] bg-white">
      <div className="ap-footer mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] py-[clamp(28px,3vw,44px)]">
        <div className="ap-footer-brand">
          <div className="ap-footer-logo flex flex-none items-center justify-center overflow-hidden">
            <Image
              src="/uploads/logo-big.png"
              alt="Aproop Production"
              width={200}
              height={162}
              className="block h-full w-auto flex-none object-contain"
              style={{ clipPath: "inset(0 11% 0 11%)", margin: "0 -10px" }}
            />
          </div>
          <div className="ap-footer-copy">
            <span className="ap-footer-tag text-[11.5px] font-medium uppercase tracking-[0.24em] text-[#141414]">
              Ad Films · Documentaries · Short Films · Songs &amp; Jingles
            </span>
            <address className="ap-footer-addr">
              Flat 36, Fourth Floor, Building 2, Gopinath Nagar Cooperative
              Society, Chaitanya Nagar, Near Gandhi Bhavan, Kothrud, Pune
              (Maharashtra, India) — 411038
            </address>
          </div>
        </div>

        <div className="ap-footer-meta">
          <span className="text-[11.5px] uppercase tracking-[0.2em] text-[rgba(20,20,20,.55)]">
            © 2025 Aproop Production
          </span>
          <BackToTop className="inline-flex min-h-11 items-center gap-[9px] py-3 text-[11.5px] font-medium uppercase tracking-[0.22em] text-[#141414] transition-colors duration-300 hover:text-[#a8781c]" />
        </div>
      </div>
    </footer>
  );
}
