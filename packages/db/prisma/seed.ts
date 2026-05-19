// Seed script — populates the curated interest dictionary and an admin user.
// Run with: pnpm --filter @yuno/db run seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INTERESTS: Array<{ slug: string; label: string; category: string }> = [
  // music
  { slug: "kpop",            label: "K-pop",              category: "music" },
  { slug: "indie",           label: "Indie music",        category: "music" },
  { slug: "hiphop",          label: "Hip-hop",            category: "music" },
  { slug: "edm",             label: "EDM",                category: "music" },
  { slug: "rock",            label: "Rock",               category: "music" },
  { slug: "jazz",            label: "Jazz",               category: "music" },
  { slug: "classical",       label: "Classical",          category: "music" },
  { slug: "lofi",            label: "Lo-fi",              category: "music" },
  { slug: "vinyl",           label: "Vinyl",              category: "music" },

  // lifestyle
  { slug: "late-night",      label: "Late-night vibes",   category: "lifestyle" },
  { slug: "coffee",          label: "Coffee",             category: "lifestyle" },
  { slug: "tea",             label: "Tea",                category: "lifestyle" },
  { slug: "cooking",         label: "Cooking",            category: "lifestyle" },
  { slug: "fitness",         label: "Fitness",            category: "lifestyle" },
  { slug: "travel",          label: "Travel",             category: "lifestyle" },
  { slug: "fashion",         label: "Fashion",            category: "lifestyle" },
  { slug: "minimalism",      label: "Minimalism",         category: "lifestyle" },

  // creative
  { slug: "art",             label: "Art",                category: "creative" },
  { slug: "photography",     label: "Photography",        category: "creative" },
  { slug: "writing",         label: "Writing",            category: "creative" },
  { slug: "filmmaking",      label: "Filmmaking",         category: "creative" },
  { slug: "design",          label: "Design",             category: "creative" },
  { slug: "music-prod",      label: "Music production",   category: "creative" },

  // tech
  { slug: "coding",          label: "Coding",             category: "tech" },
  { slug: "indie-hackers",   label: "Indie hacking",      category: "tech" },
  { slug: "ai",              label: "AI / ML",            category: "tech" },
  { slug: "gamedev",         label: "Game dev",           category: "tech" },
  { slug: "startups",        label: "Startups",           category: "tech" },

  // gaming
  { slug: "indie-games",     label: "Indie games",        category: "gaming" },
  { slug: "fps",             label: "FPS",                category: "gaming" },
  { slug: "rpg",             label: "RPG",                category: "gaming" },
  { slug: "rhythm-games",    label: "Rhythm games",       category: "gaming" },
  { slug: "speedrunning",    label: "Speedrunning",       category: "gaming" },

  // languages — for language exchange
  { slug: "language-en",     label: "English",            category: "language" },
  { slug: "language-es",     label: "Spanish",            category: "language" },
  { slug: "language-pt",     label: "Portuguese",         category: "language" },
  { slug: "language-fr",     label: "French",             category: "language" },
  { slug: "language-de",     label: "German",             category: "language" },
  { slug: "language-it",     label: "Italian",            category: "language" },
  { slug: "language-jp",     label: "Japanese",           category: "language" },
  { slug: "language-ko",     label: "Korean",             category: "language" },
  { slug: "language-zh",     label: "Mandarin",           category: "language" },
  { slug: "language-ar",     label: "Arabic",             category: "language" },
  { slug: "language-hi",     label: "Hindi",              category: "language" },
  { slug: "language-id",     label: "Indonesian",         category: "language" },
  { slug: "language-tr",     label: "Turkish",            category: "language" },
  { slug: "language-ru",     label: "Russian",            category: "language" },

  // mood / context
  { slug: "deep-talks",      label: "Deep talks",         category: "mood" },
  { slug: "small-talk",      label: "Small talk",         category: "mood" },
  { slug: "venting",         label: "Venting",            category: "mood" },
  { slug: "philosophy",      label: "Philosophy",         category: "mood" },
  { slug: "comedy",          label: "Comedy",             category: "mood" },

  // hobbies
  { slug: "books",           label: "Books",              category: "hobby" },
  { slug: "movies",          label: "Movies",             category: "hobby" },
  { slug: "anime",           label: "Anime",              category: "hobby" },
  { slug: "manga",           label: "Manga",              category: "hobby" },
  { slug: "f1",              label: "Formula 1",          category: "hobby" },
  { slug: "football",        label: "Football",           category: "hobby" },
  { slug: "basketball",      label: "Basketball",         category: "hobby" },
  { slug: "skating",         label: "Skating",            category: "hobby" },
  { slug: "surfing",         label: "Surfing",            category: "hobby" },
  { slug: "hiking",          label: "Hiking",             category: "hobby" },
  { slug: "astronomy",       label: "Astronomy",          category: "hobby" },
  { slug: "history",         label: "History",            category: "hobby" },

  // generic / discovery
  { slug: "random",          label: "Random",             category: "general" },
];

async function main() {
  console.log(`Seeding ${INTERESTS.length} interests...`);
  for (const i of INTERESTS) {
    await prisma.interest.upsert({
      where: { slug: i.slug },
      update: { label: i.label, category: i.category, isActive: true },
      create: { ...i, isActive: true },
    });
  }
  console.log("Interests seeded.");

  // Optional: create a dev admin user
  if (process.env.SEED_ADMIN_EMAIL) {
    const admin = await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL },
      update: { isAdmin: true },
      create: {
        email: process.env.SEED_ADMIN_EMAIL,
        isAdmin: true,
        consentAge18: true,
        consentTermsAt: new Date(),
        passwordHash: "REPLACE_VIA_RESET_FLOW",
      },
    });
    console.log(`Admin user: ${admin.email} (id=${admin.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
