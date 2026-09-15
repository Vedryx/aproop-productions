import { getPublicContent } from "@/lib/admin/content";
import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import ProducerBody from "@/components/sections/ProducerBody";
import ProducerHeader from "@/components/layout/ProducerHeader";

export const metadata: Metadata = {
  title: "Be the Producer — Aproop Production",
  description:
    "Back a story before the world sees it. Contribute to the films on our desk right now and your name rolls in the credits as a producer.",
  openGraph: {
    title: "Be the Producer — Aproop Production",
    description:
      "Back a story before the world sees it. Pick a film, contribute what feels right, take a producer credit.",
    type: "website",
    images: [
      { url: "/og.jpg", width: 1200, height: 630, alt: "Aproop Production" },
    ],
  },
};

export const dynamic = "force-dynamic";

export default async function BeTheProducerPage() {
  const { projects } = await getPublicContent();
  return (
    <div className="min-h-screen bg-ink font-body text-cream">
      <ProducerHeader />

      <section data-screen-label="Producer hero" className="bg-gold text-ink">
        <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] py-[clamp(56px,7vw,104px)]">
          <div className="mb-[clamp(18px,2.6vw,30px)] text-[12px] font-medium uppercase tracking-[0.26em] text-[#7c5410]">
            05 / Be the producer
          </div>
          <h1 className="m-0 font-display text-[clamp(42px,6vw,92px)] font-normal leading-none tracking-[-0.01em] [text-wrap:pretty]">
            Back a story
            <br />
            <em className="italic">before the world sees it.</em>
          </h1>
          <p className="mb-0 mt-[clamp(24px,3vw,40px)] max-w-[44ch] text-[clamp(16px,1.3vw,19px)] leading-[1.75] text-[#2c2519]">
            These are the films on our desk right now. Pick one, contribute what
            feels right, and your name rolls in the credits as a producer.
          </p>
        </div>
      </section>

      <ProducerBody projects={projects} />
      <Footer />
    </div>
  );
}
