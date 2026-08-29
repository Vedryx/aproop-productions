"use client";

import { useState } from "react";
import { projects } from "@/lib/producer";
import PitchModal from "./PitchModal";
import ProjectCard from "./ProjectCard";

export default function ProducerBody() {
  const [pitch, setPitch] = useState(false);

  return (
    <>
      <section
        data-screen-label="Open projects"
        className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(36px,4.4vw,64px)] px-[clamp(20px,4vw,56px)] py-[clamp(56px,7vw,100px)]"
      >
        {projects.map((p) => (
          <ProjectCard key={p.title} project={p} />
        ))}

        <p className="m-0 text-[clamp(15px,1.2vw,17px)] font-light leading-[1.75] text-muted">
          Have a story of your own?{" "}
          <button
            type="button"
            onClick={() => setPitch(true)}
            className="cursor-pointer border-0 border-b border-gold bg-transparent pb-1 text-inherit text-gold transition-colors duration-300 hover:text-gold-light"
          >
            Pitch it to us ↗
          </button>
        </p>
      </section>

      <PitchModal open={pitch} onClose={() => setPitch(false)} />
    </>
  );
}
