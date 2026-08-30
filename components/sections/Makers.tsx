import Eyebrow from "@/components/ui/Eyebrow";
import SafeImg from "@/components/ui/SafeImg";

const HELLO =
  "mt-2 inline-flex min-h-11 items-center gap-2.5 border-b border-[rgba(193,86,58,.6)] pb-1.5 pt-3 text-[11.5px] uppercase tracking-[0.22em] text-rust transition-colors hover:border-gold hover:text-gold";

/* Option 2b: the duo cutout is windowed twice so each founder gets their own
   tall portrait. The crop values frame one face out of the shared image. */
const MAKERS = [
  {
    num: "01",
    name: "Harish Tarun",
    role: "Writer-Director, Founder",
    bio: "I am drawn to the poetry of everyday life. To people, their emotions, and their untold stories. For ten years, I have been finding different ways to fit these lives into a few frames. No two stories should feel the same. So I keep experimenting. A decade of stories behind me. And many more waiting to be told.",
    href: "https://www.instagram.com/ugavata.harish",
    crop: { top: "-15%", left: "-102.3%", width: "418.6%" },
  },
  {
    num: "02",
    name: "Samruddhi Kuchik",
    role: "Producer, Co-Founder",
    bio: "As a Producer at Aproop Production, I have spent the last six years behind the scenes. From the first conversation to the final frame, I bring people, places, plans, and possibilities together. Most importantly, I try to make impossible deadlines possible and ambitious scripts to screen.",
    href: "https://www.instagram.com/samruddhi_kuchik",
    crop: { top: "-32.6%", left: "-183.3%", width: "375%" },
  },
];

function MakerRow({
  m,
  mirror,
}: {
  m: (typeof MAKERS)[number];
  mirror?: boolean;
}) {
  return (
    <div className={`mk-row${mirror ? " mk-row-r" : ""}`}>
      <div className="mk-port-wrap">
        <div className="mk-port">
          <SafeImg
            src="/uploads/makers-bg.png"
            alt={m.name}
            style={{
              position: "absolute",
              top: m.crop.top,
              left: m.crop.left,
              width: m.crop.width,
              height: "auto",
              maxWidth: "none",
            }}
          />
        </div>
        <span aria-hidden="true" className="mk-num">
          {m.num}
        </span>
      </div>

      <div className="mk-head">
        <h3 className="mk-name">{m.name}</h3>
        <span className="mk-role">{m.role}</span>
      </div>

      <div className="mk-body">
        <p>{m.bio}</p>
        <a href={m.href} target="_blank" rel="noopener" className="mk-hello">
          Say hello <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}

export default function Makers() {
  return (
    <section
      id="makers"
      data-screen-label="Makers"
      className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] pb-[clamp(70px,8vw,120px)] pt-[clamp(50px,6vw,100px)]"
    >
      <div className="ap-2col mb-[clamp(6px,1vw,18px)] grid grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] items-start gap-[clamp(24px,4vw,60px)]">
        <div>
          <Eyebrow
            top="04 / The makers"
            bottom="04 / Core team"
            className="mb-[clamp(14px,1.8vw,24px)]"
          />
          <h2
            data-reveal=""
            className="m-0 font-display text-[clamp(40px,5.6vw,84px)] font-normal leading-none text-cream-2"
          >
            Nice to meet
            <br />
            <em className="italic text-gold">the humans.</em>
          </h2>
        </div>
      </div>

      <div className="ap-mk-desktop">
      <div className="ap-mkrow relative mx-auto grid min-h-[clamp(480px,44vw,640px)] max-w-[1480px] grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-center gap-[clamp(16px,2vw,34px)]">
        <SafeImg
          src="/uploads/makers-bg.png"
          alt="Harish Tarun and Samruddhi Kuchik"
          width={889}
          height={507}
          className="ap-mkimg"
        />

        <div
          className="ap-mkcol relative flex flex-col items-start gap-3.5 self-end justify-self-start pb-[clamp(14px,1.6vw,30px)] text-left"
          style={{
            maxWidth:
              "min(330px, calc(50vw - clamp(20px,4vw,56px) - min(240px,14.5vw) - 24px))",
          }}
        >
          <p className="m-0 w-full max-w-[62ch] text-left text-[12.5px] font-light leading-[1.62] text-muted">
            I am drawn to the poetry of everyday life. To people, their emotions,
            and their untold stories. For ten years, I have been finding different
            ways to fit these lives into a few frames. No two stories should feel
            the same. So I keep experimenting. A decade of stories behind me. And
            many more waiting to be told.
          </p>
          <h3 className="mb-0 mt-2.5 font-display text-[clamp(24px,2.1vw,32px)] font-medium text-cream-2">
            Harish Tarun
          </h3>
          <span className="bg-gold px-4 py-[9px] text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
            Writer-Director, Founder
          </span>
          <a
            href="https://www.instagram.com/ugavata.harish"
            target="_blank"
            rel="noopener"
            className={HELLO}
          >
            Say hello <span>↗</span>
          </a>
        </div>

        <div
          className="ap-mkcol relative flex flex-col items-end gap-3.5 self-start justify-self-end pt-[clamp(48px,6vw,120px)] text-right"
          style={{
            maxWidth:
              "min(330px, calc(50vw - clamp(20px,4vw,56px) - min(240px,14.5vw) - 24px))",
          }}
        >
          <h3 className="m-0 font-display text-[clamp(24px,2.1vw,32px)] font-medium text-cream-2">
            Samruddhi Kuchik
          </h3>
          <span className="flex h-[33px] w-[215px] items-center bg-gold px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
            Producer, Co-Founder
          </span>
          <p className="m-0 mt-2 w-full max-w-[62ch] text-left text-[12.5px] font-light leading-[1.62] text-muted">
            As a Producer at Aproop Production, I have spent the last six years
            behind the scenes. From the first conversation to the final frame, I
            bring people, places, plans, and possibilities together. Most
            importantly, I try to make impossible deadlines possible and ambitious
            scripts to screen.
          </p>
          <a
            href="https://www.instagram.com/samruddhi_kuchik"
            target="_blank"
            rel="noopener"
            className={HELLO}
          >
            Say hello <span>↗</span>
          </a>
        </div>
      </div>
      </div>

      {/* Option 2b — mobile and tablet. Desktop keeps the single cutout above. */}
      <div className="ap-mk-compact">
        <MakerRow m={MAKERS[0]} />
        <MakerRow m={MAKERS[1]} mirror />
      </div>
    </section>
  );
}
