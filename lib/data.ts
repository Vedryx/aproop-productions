export type Film = {
  title: string;
  vid: string;
  client: string;
  award?: boolean;
};

export type Shelf = {
  key: string;
  num: string;
  short: string;
  projectLine: string;
  title: string;
  line: string;
  meta: string;
  slot: string;
  ph: string;
  award?: boolean;
  list: string;
  films: Film[];
};

export const shelfData: Shelf[] = [
  {
    key: "Ad Films",
    num: "01",
    short: "Ad film",
    projectLine: "Brand film — add the client and the one line it turns on.",
    title: "Ads that don't feel like ads.",
    line: "Brand films and TVCs built around a single human beat, not a feature list.",
    meta: "TVC · Digital · Brand",
    slot: "wk-ad",
    ph: "Ad film still",
    list: "PLjTgYkwNvReu3gUvzYLrfGsPrRg-gb26V",
    films: [
      {
        title: "Forest Fire",
        vid: "1r97KROnFFM",
        client: "Maharashtra Forest Dept. · Nashik Div.",
      },
      {
        title: "Breaking Silence",
        vid: "hxTMd_vq1cY",
        client: "Maharashtra Forest Dept. · Nashik Div.",
      },
      {
        title: "AISSMS Engg College TVC",
        vid: "RcJADWtUd-8",
        client: "AISSM Society · 2024",
      },
      {
        title: "Sannatural Ayurveda",
        vid: "uw9XYJM_pjY",
        client: "Sancho-T product launch",
      },
      {
        title: "Suraj Hurda Party DVC",
        vid: "-4TP9VvD_S4",
        client: "Hotel Suraj, Parner",
      },
      {
        title: "AISSMS COE TVC",
        vid: "BxTlQoN30Mg",
        client: "AISSMS COE · 2023",
      },
      {
        title: "AISSMS IOIT TVC",
        vid: "5h9p-bMvJKo",
        client: "AISSMS IOIT · 2023",
      },
    ],
  },
  {
    key: "Documentaries",
    num: "02",
    short: "Documentary",
    projectLine: "Long-form portrait — add the subject and the year.",
    title: "Turn experience into a legacy.",
    line: "Long-form portraits of people and places, shot patiently and cut honestly.",
    meta: "Long form · Portrait",
    slot: "wk-doc",
    ph: "Documentary frame",
    list: "PLjTgYkwNvRes1MvBMahIjjL8n5ETesRlp",
    films: [
      {
        title: "वनवा / Vanva",
        vid: "t-AKeURynIY",
        client: "Maharashtra Forest Dept. · Chakan Div.",
      },
      {
        title: "CAMPA Initiative",
        vid: "0jFVOKlD9Qs",
        client: "Maharashtra Forest Dept. · Junnar Div.",
      },
      {
        title: "केळशी / Kelshi",
        vid: "XMoyNHGMjXA",
        client: "Kelshi Tourism · Bharjaa Inn",
      },
      {
        title: "Vinchurniche Gandhi",
        vid: "Y-_n1DQndVE",
        client: "Long-form portrait",
      },
      {
        title: "Sanjay Gandhi National Park",
        vid: "-en5rgCZTO8",
        client: "SGNP, Mumbai",
      },
      {
        title: "Mamdapur Grass Nursery",
        vid: "e9kCyeKd8ck",
        client: "Maharashtra Forest Dept. · Nashik Div.",
      },
    ],
  },
  {
    key: "Short Films",
    num: "03",
    short: "Short film",
    projectLine: "Original script — add the title, festival and year.",
    title: "Madhu, and the ones after it.",
    line: "Original scripts we write and direct ourselves—our award-winning shelf.",
    meta: "Fiction · Festival · 2024",
    slot: "wk-short",
    ph: "Madhu — award-winning still",
    award: true,
    list: "PLjTgYkwNvResI2kmwKqjjCpqLmRLQ2d3J",
    films: [
      {
        title: "मधू / Madhu",
        vid: "FQJ_eiRiA-0",
        client: "Short film · BISFF finalist",
        award: true,
      },
    ],
  },
  {
    key: "Jingles & Songs",
    num: "04",
    short: "Track",
    projectLine: "Written and composed — add the brand and the hook.",
    title: "Give your brand a sound of its own.",
    line: "Written, composed and produced music, cut to picture from the first draft.",
    meta: "Music · Composition",
    slot: "wk-song",
    ph: "Song / jingle frame",
    list: "PLjTgYkwNvRev01Pra-GV2DR_5wsJxz328",
    films: [
      {
        title: "लहान मुलांना एकटे सोडू नका",
        vid: "T_YM7aGBYWQ",
        client: "Maharashtra Forest Dept.",
      },
      {
        title: "एकटे फिरू नका",
        vid: "oZlfjZlE1vo",
        client: "Maharashtra Forest Dept.",
      },
      {
        title: "अफवा पसरवू नका",
        vid: "msoO6iKop-c",
        client: "Maharashtra Forest Dept.",
      },
      {
        title: "वनवणवे रोखूया",
        vid: "4ZG1sCJrjAM",
        client: "Maharashtra Forest Dept.",
      },
      {
        title: "उघड्यावर झोपू नका",
        vid: "xLi_DXv19Ng",
        client: "Maharashtra Forest Dept.",
      },
      {
        title: "उघड्यावर शौचाला जाऊ नका",
        vid: "KY5volgpTwE",
        client: "Maharashtra Forest Dept.",
      },
      {
        title: "अहिल्याबाई होळकर गीत",
        vid: "nZ1xFE89928",
        client: "Tribute · Ahilyadevi Holkar",
      },
      {
        title: "गोंधळ | मल्हारराव होळकर गीत",
        vid: "T_BDamNIMDc",
        client: "Tribute · Malharrao Holkar",
      },
    ],
  },
];

export const testimonials = [
  {
    text: "We are very happy with the videos created for the conservation campaign with celebrity faces. Aproop Production has done an excellent job with great creativity and professionalism. Thank you for supporting our conservation efforts. Wishing the team all the very best!",
    who: "Mr. Umesh Waware",
    org: "IFS, Deputy Conservator of Forest, Nashik (East) Forest Division",
  },
  {
    text: "We have been working with Aproop Production even before it was ‘Aproop Production’. I'll always remember the team, especially Harish and Samruddhi, for their dedication and involvement in the project. We'll love to work with them again and recommend them because of the passion they have in what they do — it's beyond words.",
    who: "Mr. Kunal Ranveer",
    org: "Director, Adolf Solutions",
  },
  {
    text: "Thanks to Aproop, my digital branding is stronger than ever! Their creative videos and strategy went beyond expectations and have truly helped my business grow. Wishing Harish and his team continued success!",
    who: "Mr. Vikram Pathare",
    org: "Co-Founder, Hotel Suraj, Parner",
  },
  {
    text: "Working alongside Aproop Production on our recent project was a fantastic experience. Their dedication to detail, innovative approach and commitment to meeting deadlines were truly commendable.",
    who: "Mrs. Sasha Shelke",
    org: "Head, Media, Marketing & Industry Connect, AISSMS",
  },
  {
    text: "It was nice working with the Aproop team. Everyone is a highly professional and humble artist. Every minute detail was incorporated in both the documentaries. It made the project so real and unique!! Thank you Harish and the Aproop team.",
    who: "Mrs. Smita Rajhans",
    org: "ACF, Junnar Division, Maharashtra Forest Department",
  },
  {
    text: "We appreciate the effort you guys have taken! The short documentary helped me to reach many donors and volunteers. Thank you so much.",
    who: "Mrs. Vanita Sawant",
    org: "Founder, Om Pratishthan, Pune",
  },
];

export const faqData = [
  {
    q: "So… how much does a film cost?",
    a: "Ah, the million-rupee question! (Sometimes literally. Mostly, not.)\nThere’s no one-size-fits-all price because every film has its own story, scale and little quirks. The budget can depend on the concept, duration, shoot days, locations, cast, crew, equipment and post-production.\nTell us what you have in mind, and we’ll help figure out the smartest way to bring it to seamless conversation without making the budget feel like a thriller.",
  },
  {
    q: "Do you handle the entire production process?",
    a: "Yes.\nFrom pre-production, scripting and planning to casting, locations, crew, shooting, editing, sound, colour grading, graphics, music and mixing to final delivery. we can handle the entire journey. Of course, this is a professionally ‘crewzy’ thing!",
  },
  {
    q: "What kind of films does Aproop make?",
    a: "The short answer? — various types of creatives…\nThe longer answer? — Documentaries, brand films, advertising films, short films, songs, jingles and cinematic reels.",
  },
  {
    q: "How long does it take to make a film?",
    a: "It depends on the project. A simple corporate or social media film might take a few days, while documentaries and larger productions can take several weeks or even months.\nAs a general guide, many Ad films can take around 2–3 weeks from concept to final delivery. We move as quickly as the project allows but never so quickly that the film forgets to look good.",
  },
  {
    q: "Do you work with small budgets?",
    a: "Why not?\nA smaller budget doesn't mean we can't make something good. But it does mean we need to be clear about what is possible and what kind of output you're expecting.\nA big-budget idea and a small-budget execution are not always the same thing. The good news? We can help you figure out where to scale, where to simplify and where it’s worth spending.\nSo, come to us with your budget and your expectations. We'll have an honest conversation and see how best we can make it work.\nAnd yes, just like everything else in life, Jitne mein jitna milta hai utna milega. But within that, we'll always try to find the smartest and most creative way forward.",
  },
  {
    q: "What if I only have an idea and no script?",
    a: "Perfect. That's how many good films begin.\nYou can come to us with a complete script, a rough concept, a reference board or simply an idea that you can't stop thinking about.\nAnd if you need a little creative push, our writing department is highly appreciated by our clients, so we can also help you explore some fresh ideas, develop the concept and shape the story. From there, we can write the script and take it all the way through production.\nBasically, bring us the spark. Our team will help build the fire.",
  },
  {
    q: "So, I want to inquire about an ad film or documentary. What happens next?",
    a: "Firstly, we talk. Over a call, coffee, meeting or whatever works best.\nWe get to know your brand or organisation, understand what you’re trying to communicate and discuss the different possibilities for the project.\nThen comes the important part: figuring out what actually makes sense. Depending on your requirements, we may suggest the type of film, creative direction and content strategy that could work best.\nFrom there, the journey usually looks something like this:\nIdeas → Strategy → Budget → Approval → Advance → Script → Plan → Shoot → Edit → Feedback → Final Film → Remaining Payment → Your Feedback → Hopefully, the next project! 🚀",
  },
];

export const menuItems = [
  { label: "Work", href: "#work", num: "01" },
  { label: "Services", href: "#services", num: "02" },
  { label: "About", href: "#about", num: "03" },
  { label: "Be the Producer", href: "#producer", num: "04" },
  { label: "Contact", href: "#contact", num: "05" },
];

export const phases = [
  {
    num: "01",
    stage: "Before the camera",
    title: "Pre-Production",
    kicker: "Idea → script → plan",
    body: "The part nobody sees and everybody feels. We find the story, then build the plan that protects it.",
    icon: "M12 5 h20 l6 6 v32 h-26 Z M12 14 h14 M12 22 h18 M12 30 h12",
    iconAnim: "ap-nudge 5s ease-in-out infinite",
    items: [
      "Concept Development",
      "Scripting",
      "Storyboarding",
      "Logistics & Permissions",
      "Casting",
    ],
  },
  {
    num: "02",
    stage: "On the floor",
    title: "Production",
    kicker: "Lights → camera → take",
    body: "Lights on, cameras rolling. A calm set where every department knows the frame we are chasing.",
    icon: "M4 16 h26 v18 h-26 Z M30 22 l12 -6 v18 l-12 -6 Z M10 16 v18",
    iconAnim: "ap-pulse 4.5s ease-in-out infinite",
    items: [
      "Direction",
      "Cinematography",
      "Celebrity Management",
      "Event Photography & Cinematography",
      "Corporate Photography & Cinematography",
    ],
  },
  {
    num: "03",
    stage: "After the wrap",
    title: "Post-Production",
    kicker: "Cut → grade → mix",
    body: "This is where footage becomes a film and a film becomes a feeling.",
    icon: "M6 20 v8 M14 12 v24 M22 6 v36 M30 14 v20 M38 19 v10 M44 22 v4",
    iconAnim: "ap-blink 3.6s ease-in-out infinite",
    items: [
      "Video Editing",
      "Colour Grading",
      "Sound Design",
      "Sound Mixing",
      "Music & Background Score",
      "Voice-Over",
      "Foley & SFX",
    ],
  },
];

export const logoHeights = [
  48, 76, 76, 61, 48, 76, 75, 76, 76, 76, 59, 76, 65, 76, 76, 75, 64, 75, 54,
  76,
];

export const logoFiles = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "18",
  "19",
  "20",
  "21",
];
