import Eyebrow from "./Eyebrow";
import SafeImg from "./SafeImg";

/**
 * Placeholder: the design calls for `/uploads/founders-cutout.png`, which has
 * not been supplied yet. This is the Makers duo photo cropped to its subjects
 * (the source is a 16:9 frame with wide transparent margins, which left the
 * figures looking small in this column). Regenerate with:
 *
 *   python3 -c "from PIL import Image; i=Image.open('public/uploads/makers-bg.png').convert('RGBA'); i.crop(i.getbbox()).save('public/uploads/about-portrait.png')"
 *
 * Point this back at the cutout once it lands — `npm run assets` picks it up.
 */
const PORTRAIT = "/uploads/about-portrait.png";

export default function About() {
  return (
    <section
      id="about"
      data-screen-label="Synopsis"
      className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,.42fr)_minmax(0,.58fr)] items-center gap-[clamp(24px,4vw,64px)] px-[clamp(20px,4vw,56px)] py-[clamp(70px,8vw,130px)]"
    >
      <div>
        <Eyebrow top="03 / Synopsis" bottom="03 / About us" className="mb-7" />
        <SafeImg
          src={PORTRAIT}
          alt="Harish and Samruddhi"
          className="mx-auto mt-[clamp(6px,1vw,14px)] block h-auto w-full max-w-[460px]"
        />
      </div>

      <div className="min-w-0 pl-[clamp(0px,2vw,36px)]">
        <h2
          data-reveal=""
          className="m-0 font-display text-[clamp(38px,5.2vw,78px)] font-normal leading-[1.02] text-cream-2"
        >
          A story about
          <br />
          <em className="italic text-gold">two storytellers.</em>
        </h2>
        <div className="mt-[clamp(30px,4vw,54px)] flex max-w-[60ch] flex-col gap-[22px]">
          <p className="m-0 text-[clamp(16px,1.25vw,18.5px)] font-light leading-[1.85] text-muted">
            In 2015, two aspiring filmmakers, Harish and Samruddhi, cross paths
            while creating their first short film. What begins as a creative
            collaboration slowly transforms into friendship, then love, united by a
            shared obsession with storytelling. Their second film finds
            recognition, but the true story unfolds away from the applause.
          </p>
          <p className="m-0 text-[clamp(16px,1.25vw,18.5px)] font-light leading-[1.85] text-muted">
            Through uncertainty, persistence, and countless unfinished drafts,
            Aproop Production is born in 2019. As the years pass, the studio crafts
            stories for brands, companies, and institutions, through documentaries,
            commercials, music videos, and narrative films, quietly seeking the
            point where purpose meets creativity. And while each film reaches its
            own destination, together they become chapters of a larger story: one
            still waiting to be told.
          </p>
        </div>
      </div>
    </section>
  );
}
