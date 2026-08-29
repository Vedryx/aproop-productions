import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aproopproduction.com"),
  title: "Aproop Production — Ad Films, Documentaries, Short Films, Songs",
  description:
    "Aproop Production is a film studio crafting advertising films, documentaries, short films, songs and jingles. Good films aren't accidents.",
  openGraph: {
    title: "Aproop Production",
    description:
      "Ad Films · Documentaries · Short Films · Songs & Jingles. Let's make something worth watching.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aproop Production" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aproop Production",
    description:
      "Ad Films · Documentaries · Short Films · Songs & Jingles.",
    images: ["/og.jpg"],
  },
};

/**
 * Runs before first paint so the cold open never flashes on a session that has
 * already seen it. Pairs with `IntroClap` and the `[data-intro-seen]` rule in
 * globals.css.
 */
const INTRO_FLAG = `try{var k='ap-intro-seen',d=document.documentElement;if(sessionStorage.getItem(k)){d.setAttribute('data-intro-seen','1')}else if(location.pathname!=='/'){sessionStorage.setItem(k,'1');d.setAttribute('data-intro-seen','1')}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jost.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_FLAG }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
