"use client";

import { useEffect, useState } from "react";
import type { AdminProject } from "@/lib/admin/schema";
import type { FundingView } from "@/lib/payments/model";
import "@/components/payments/payments.css";
import PitchModal from "@/components/ui/PitchModal";
import ProjectCard from "@/components/ui/ProjectCard";

export default function ProducerBody({
  projects,
}: {
  projects: AdminProject[];
}) {
  const [pitch, setPitch] = useState(false);
  const [funding, setFunding] = useState<FundingView[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/funding", { cache: "no-store" });
        if (r.ok && active) setFunding(await r.json());
      } catch {
        /* Server validates availability again at checkout. */
      }
    };
    void refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <>
      <section
        data-screen-label="Open projects"
        className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(36px,4.4vw,64px)] px-[clamp(20px,4vw,56px)] py-[clamp(56px,7vw,100px)]"
      >
        {!projects.length && (
          <p className="text-muted">
            New stories are on their way. Check back soon.
          </p>
        )}
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            funding={funding.find((f) => f.projectId === p.id)}
          />
        ))}

        <p className="m-0 text-[clamp(15px,1.2vw,17px)] font-light leading-[1.75] text-muted">
          Have a story of your own?{" "}
          <button
            type="button"
            onClick={() => setPitch(true)}
            className="min-h-11 cursor-pointer border-0 border-b border-gold bg-transparent pb-1 pt-3 text-inherit text-gold transition-colors duration-300 hover:text-gold-light"
          >
            Pitch it to us ↗
          </button>
        </p>
      </section>

      <PitchModal open={pitch} onClose={() => setPitch(false)} />
    </>
  );
}
