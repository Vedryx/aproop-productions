import Link from "next/link";
import type { AdminProject } from "@/lib/admin/schema";
import Eyebrow from "@/components/ui/Eyebrow";
import SafeImg from "@/components/ui/SafeImg";

const PRODUCER_HREF = "/be-the-producer";

export default function Producer({ projects }: { projects: AdminProject[] }) {
  const featured = projects
    .filter((p) => p.homepageSlot)
    .sort((a, b) => a.homepageSlot - b.homepageSlot);
  return (
    <section
      id="producer"
      data-screen-label="Crowd funding"
      className="bg-gold text-ink"
    >
      <div className="ap-cfgrid mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] items-start gap-[clamp(30px,4vw,70px)] px-[clamp(20px,4vw,56px)] py-[clamp(60px,7vw,110px)]">
        <div>
          <Eyebrow
            top="05 / Be the producer"
            bottom="05 / Support a story"
            tone="gold"
            className="mb-[clamp(20px,3vw,36px)]"
          />
          <h2
            data-reveal=""
            className="m-0 font-display text-[clamp(40px,5.6vw,84px)] font-normal leading-none text-ink"
          >
            Some stories
            <br />
            <em className="italic text-cream-3">need a little help.</em>
          </h2>
          <p className="mb-0 mt-[clamp(26px,3vw,40px)] max-w-[40ch] text-[clamp(16px,1.3vw,19px)] leading-[1.75] text-[#2c2519]">
            We have a few stories in the works that deserve to be seen. Help us
            take them from rough page to final frame.
          </p>
        </div>

        <div className="flex flex-col items-start gap-[clamp(28px,3vw,42px)]">
          <div className="relative w-full max-w-[520px] self-end pb-[34px]">
            {featured.map((project, index) => (
              <Link
                key={project.id}
                href={`${PRODUCER_HREF}#story-${project.id}`}
                aria-label={project.title}
                className={
                  index === 0
                    ? "relative block aspect-[16/10] w-[72%] -rotate-2 overflow-hidden border border-[rgba(19,18,17,.32)] bg-[#c9a234] shadow-[0_16px_40px_rgba(19,18,17,.24)] transition-all duration-500 hover:-translate-y-2 hover:rotate-0"
                    : "absolute bottom-0 right-0 block aspect-[16/10] w-[64%] rotate-[2.4deg] overflow-hidden border border-[rgba(19,18,17,.32)] bg-[#c9a234] shadow-[0_16px_40px_rgba(19,18,17,.28)] transition-all duration-500 hover:-translate-y-1 hover:rotate-0"
                }
              >
                <SafeImg
                  src={project.poster}
                  alt={project.ph}
                  className="absolute inset-0 block h-full w-full object-cover"
                />
                <span className="absolute left-0 top-3.5 bg-ink px-[11px] py-1.5 text-[11px] uppercase tracking-[0.22em] text-gold">
                  {project.kind}
                </span>
                <span
                  className="absolute inset-x-0 bottom-0 px-4 pb-[13px] pt-[22px] font-display text-[clamp(17px,1.5vw,22px)] leading-[1.15] text-cream-3"
                  style={{
                    background:
                      "linear-gradient(to top,rgba(19,18,17,.82),transparent)",
                  }}
                >
                  {project.title}
                </span>
              </Link>
            ))}
          </div>

          <Link
            href={PRODUCER_HREF}
            className="inline-flex cursor-pointer items-center gap-[22px] border-none bg-ink px-[30px] py-[22px] text-[12.5px] font-semibold uppercase tracking-[0.22em] text-gold transition-all duration-300 hover:-translate-y-[3px] hover:bg-[#2a2622]"
            style={{ animation: "ap-attract 3.8s ease-in-out infinite" }}
          >
            Support a story <span className="text-sm">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
