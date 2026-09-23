import { getPublicContent } from "@/lib/admin/content";
import { publicShelves } from "@/lib/public-content";
import { connection } from "next/server";
import About from "@/components/sections/About";
import Brands from "@/components/sections/Brands";
import Contact from "@/components/sections/Contact";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/layout/Footer";
import HashScroll from "@/components/system/HashScroll";
import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import IntroClap from "@/components/system/IntroClap";
import Makers from "@/components/sections/Makers";
import Producer from "@/components/sections/Producer";
import Reveal from "@/components/system/Reveal";
import Services from "@/components/sections/Services";
import Work from "@/components/sections/Work";

export default async function Home() {
  await connection();
  const content = await getPublicContent();
  return (
    <div className="relative min-h-screen bg-ink font-body text-cream">
      <Reveal />
      <HashScroll />
      <IntroClap />
      <Header />
      <h1 className="sr-only">
        Aproop Production — ad films, documentaries, short films, songs and
        jingles
      </h1>
      <Hero />
      <Work shelfData={publicShelves(content.shelves)} />
      <Brands />
      <Services />
      <About />
      <Makers />
      <Producer projects={content.projects} />
      <Contact />
      <Faq />
      <Footer />
    </div>
  );
}
