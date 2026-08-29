import About from "@/components/About";
import Brands from "@/components/Brands";
import Contact from "@/components/Contact";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import HashScroll from "@/components/HashScroll";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import IntroClap from "@/components/IntroClap";
import Makers from "@/components/Makers";
import Producer from "@/components/Producer";
import Reveal from "@/components/Reveal";
import Services from "@/components/Services";
import Work from "@/components/Work";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-ink font-body text-cream">
      <Reveal />
      <HashScroll />
      <IntroClap />
      <Header />
      <Hero />
      <Work />
      <Brands />
      <Services />
      <About />
      <Makers />
      <Producer />
      <Contact />
      <Faq />
      <Footer />
    </div>
  );
}
