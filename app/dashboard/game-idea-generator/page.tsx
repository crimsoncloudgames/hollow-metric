"use client";

import { useState } from "react";
import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";

import {
  dispatchCreditsBalanceUpdated,
  normalizeCreditsBalance,
} from "@/lib/credits-ui";
import { createClient } from "@/utils/supabase/client";

type IdeaFieldKey =
  | "genre"
  | "playerAction"
  | "coreMechanics"
  | "features"
  | "setting"
  | "mood"
  | "twist"
  | "hook"
  | "audienceAngle"
  | "perspective";

type IdeaFormState = Record<IdeaFieldKey, string> & {
  customIdea: string;
};

type GeneratedIdea = {
  label: string;
  title: string;
  description: string;
  positioning: string;
};

type GeneratedIdeaResponseItem = {
  title: string;
  summary: string;
  positioning: string;
};

type GeneratedIdeasResponse = {
  ideaOne: GeneratedIdeaResponseItem;
  ideaTwo: GeneratedIdeaResponseItem;
  remainingCredits?: number;
};

type GameIdeaGenerationErrorResponse = {
  error?: string;
  errorCode?: string;
  remainingCredits?: number;
};

const GAME_IDEA_GENERATION_CREDIT_REQUIRED_MESSAGE = "1 credit or more needed for generation";

const genreOptions = Array.from(
  new Set([
    "Action",
    "Platformer",
    "Hack and Slash",
    "Fighting",
    "Shooter (FPS, TPS)",
    "Stealth",
    "Beat 'Em Up",
    "Brawler",
    "Adventure",
    "Point and Click",
    "Narrative-driven",
    "Puzzle",
    "Text-based Adventure",
    "Interactive Fiction",
    "RPG (Role-Playing Game)",
    "Action RPG",
    "Tactical RPG",
    "MMORPG",
    "CRPG (Computer RPG)",
    "JRPG (Japanese RPG)",
    "Roguelike",
    "Roguelite",
    "Dungeon Crawler",
    "Open-world RPG",
    "Simulation RPG",
    "Life Simulation RPG",
    "Simulation",
    "Life Simulation",
    "Vehicle Simulation",
    "Flight Simulation",
    "Farming Simulation",
    "City-building",
    "Social Simulation",
    "Business Simulation",
    "Management Simulation",
    "Strategy",
    "Real-time Strategy (RTS)",
    "Turn-based Strategy (TBS)",
    "Tower Defense",
    "MOBA (Multiplayer Online Battle Arena)",
    "Card Strategy",
    "Wargames",
    "MMO Strategy",
    "Sports",
    "Football (Soccer)",
    "Basketball",
    "Racing (Arcade, Simulation)",
    "Combat Sports (e.g., MMA, Boxing)",
    "Extreme Sports (e.g., Skateboarding, Snowboarding)",
    "Party Sports",
    "2D Fighting",
    "3D Fighting",
    "Multiplayer Fighting",
    "Racing",
    "Arcade Racing",
    "Simulation Racing",
    "Kart Racing",
    "Battle Racing",
    "Motorcycle Racing",
    "Space Racing",
    "Logic Puzzle",
    "Trivia",
    "Physics-based Puzzle",
    "Matching Puzzle",
    "Escape Room",
    "Mystery Puzzle",
    "Survival",
    "Survival Horror",
    "Crafting Survival",
    "Open-world Survival",
    "Battle Royale",
    "Sandbox Survival",
    "Cooperative Survival",
    "Horror",
    "Psychological Horror",
    "Action Horror",
    "Horror Adventure",
    "Roguelike Horror",
    "Horror Exploration",
    "Horror Escape Room",
    "Sandbox",
    "Open World Sandbox",
    "Creative Sandbox",
    "City-building Sandbox",
    "Construction Sandbox",
    "Crafting Sandbox",
    "Multiplayer Online Battle Arena",
    "Strategy MOBA",
    "PvP Battle Royale",
    "PvE Battle Royale",
    "Multiplayer Tactical Battle Royale",
    "Idle",
    "Incremental Games",
    "Clicker Games",
    "Tycoon Games",
    "Auto-battlers",
    "Music/Rhythm",
    "Dance-based",
    "Music-based Combat",
    "Rhythm-based Strategy",
    "Visual Novel",
    "Choose-your-own-adventure",
    "MMO (Massively Multiplayer Online)",
    "MMOFPS (Massively Multiplayer Online First-Person Shooter)",
    "Tactical Shooter",
    "Tactical FPS",
    "Stealth-based Shooter",
    "Co-op Tactical Shooter",
    "Card Game",
    "Deck-building Games",
    "Trading Card Games (TCG)",
    "Collectible Card Games (CCG)",
    "Solitaire",
    "Metroidvania",
    "Exploration-based with Interconnected World",
    "Action-Adventure with Upgrades",
    "Exploration + Combat",
    "Text-based Games",
    "MUD (Multi-User Dungeon)",
    "Story-driven Text Games",
    "Esports",
    "Competitive Multiplayer",
    "Strategy Esports",
    "Racing Esports",
    "Indie Games",
    "Hybrid genres, usually innovative",
    "Virtual Reality (VR)",
    "VR First-Person",
    "VR Puzzle",
    "VR Social Spaces",
    "VR Action",
    "Augmented Reality (AR)",
    "AR Action",
    "AR Puzzle",
    "AR Education",
    "Party Games",
    "Mini-games",
    "Social games",
    "Multiplayer Couch Co-op",
    "Multiplayer Trivia",
    "Art Games",
    "Abstract Games",
    "Art-based Exploration",
    "Experimental Games",
  ])
);

const playerActionOptions = [
  "Explore unknown lands",
  "Navigate through dungeons",
  "Discover hidden treasures",
  "Search for resources",
  "Investigate ruins or artifacts",
  "Scout enemy positions",
  "Track wildlife or enemies",
  "Gather raw materials (e.g., wood, metals)",
  "Mine ores or gems",
  "Harvest crops or plants",
  "Rebuild settlements or cities",
  "Fortify defenses",
  "Craft weapons and armor",
  "Create potions or magical items",
  "Repair tools, weapons, or structures",
  "Build structures or settlements",
  "Upgrade and improve existing buildings",
  "Design and construct machinery",
  "Assemble or build vehicles",
  "Plant and harvest crops",
  "Manage resources (food, water, supplies)",
  "Manage inventory",
  "Create and maintain safe zones",
  "Defend against enemy attacks",
  "Fight using melee combat (e.g., swords, fists)",
  "Use ranged weapons (e.g., guns, bows)",
  "Perform stealth takedowns",
  "Engage in combat using traps",
  "Counter and block enemy attacks",
  "Dodge and evade attacks",
  "Defend with armor or shields",
  "Parry incoming strikes",
  "Escape combat zones",
  "Perform finishing moves",
  "Heal allies or yourself",
  "Cast magic for offense or defense",
  "Summon allies or creatures",
  "Control elements (fire, water, earth)",
  "Teleport to different locations",
  "Manipulate time or space",
  "Solve puzzles",
  "Crack codes or locks",
  "Unlock doors or barriers",
  "Decode hidden messages",
  "Operate complex machinery",
  "Identify hidden clues",
  "Read and decipher documents",
  "Repair damaged mechanisms",
  "Search for clues at crime scenes",
  "Create and cast enchantments",
  "Perform rituals or incantations",
  "Dispel curses or magic",
  "Summon spirits or creatures",
  "Enchant weapons or tools",
  "Manipulate objects with telekinesis",
  "Shape-shift into animals or other forms",
  "Perform stealth movements",
  "Sneak past guards or enemies",
  "Hide in shadows or in plain sight",
  "Infiltrate enemy camps or bases",
  "Evade detection by using distractions",
  "Set traps or sabotage equipment",
  "Sabotage enemy communications or vehicles",
  "Socialize with NPCs",
  "Negotiate deals and trades",
  "Build relationships with NPCs",
  "Convince NPCs to join your cause",
  "Persuade others using charisma",
  "Lead a group of allies or survivors",
  "Interact with various factions",
  "Command troops in battle",
  "Lead diplomatic missions",
  "Form alliances or rivalries",
  "Resolve conflicts or negotiations",
  "Negotiate peace treaties",
  "Create political structures or governments",
  "Manage a business or economy",
  "Control the economy (e.g., supply chains, trade)",
  "Invest in resources, businesses, or properties",
  "Establish trade routes",
  "Compete in tournaments or competitions",
  "Organize or participate in events",
  "Perform on stage or in front of an audience",
  "Solve moral dilemmas or ethical issues",
  "Make moral or ethical decisions affecting the story",
  "Survive in hostile environments",
  "Escape dangerous locations or predators",
  "Rescue survivors or allies",
  "Navigate hostile environments (e.g., storms, earthquakes)",
  "Track down enemies or creatures",
  "Use diplomacy to solve conflicts",
  "Engage in espionage",
  "Use disguises to blend into crowds",
  "Manipulate technology (e.g., hack devices)",
  "Control machines or robots",
  "Gather information from NPCs",
  "Hack enemy systems or networks",
  "Access and interpret classified information",
  "Survive through resourcefulness",
  "Manage health, hunger, thirst, and fatigue levels",
  "Monitor vital signs (e.g., temperature, heartbeat)",
  "Adapt to environmental changes or threats",
  "Explore or use vehicles for transportation",
  "Pilot ships, planes, or spacecraft",
  "Navigate across different terrains or locations",
  "Ride animals or vehicles",
  "Fly through space or air",
  "Fly drones or other remote-controlled devices",
  "Travel through portals or dimensional rifts",
  "Set up or maintain communication systems",
  "Broadcast signals or messages",
  "Manipulate weather conditions (e.g., storm control)",
  "Participate in political schemes",
  "Perform investigations or detective work",
  "Assist or hinder NPCs in their goals",
  "Challenge authorities or leaders",
  "Decipher historical texts or ancient languages",
  "Modify or upgrade equipment",
  "Adopt new skills or abilities",
  "Transform physical traits or properties",
  "Control or influence large-scale systems",
  "Tame wild animals",
  "Create and command armies or factions",
  "Defend your group or territory",
  "Set up defensive positions",
  "Make and use healing supplies (e.g., first aid kits)",
  "Provide tactical or moral leadership to a group",
  "Assist others with their quests or needs",
  "Train other characters or NPCs",
  "Participate in duels or formal challenges",
  "Escalate confrontations or diplomacy",
  "Evade detection or hiding from enemies",
  "Perform rituals or ceremonies for cultural significance",
  "Assist with scientific or magical research",
  "Defend sacred or important sites",
  "Chase down criminals or rivals",
  "Race against time to achieve an objective",
  "Rescue items or people from danger",
  "Create traps for defense or hunting",
  "Engage in reconnaissance missions",
  "Form alliances with NPC factions",
  "Collect and share intelligence on enemy movements",
] as const;

const coreMechanicsOptions = [
  "deckbuilding",
  "card drafting",
  "tile placement",
  "worker placement",
  "resource gathering",
  "resource conversion",
  "crafting",
  "base building",
  "city building",
  "colony management",
  "automation",
  "factory building",
  "production chains",
  "survival management",
  "hunger and thirst management",
  "temperature management",
  "stamina management",
  "inventory management",
  "loadout building",
  "equipment upgrading",
  "weapon upgrading",
  "armor upgrading",
  "skill trees",
  "perk selection",
  "class switching",
  "party management",
  "squad command",
  "companion management",
  "turn-based combat",
  "real-time combat",
  "tactical pause",
  "action combat",
  "combo chaining",
  "parrying",
  "dodging",
  "blocking",
  "cover shooting",
  "stealth takedowns",
  "line of sight stealth",
  "noise management",
  "aggro management",
  "boss pattern learning",
  "wave defense",
  "tower defense",
  "trap placement",
  "checkpoint progression",
  "permadeath",
  "roguelite runs",
  "procedural generation",
  "branching choices",
  "dialogue choices",
  "reputation systems",
  "morality systems",
  "relationship building",
  "social deduction",
  "bluffing",
  "negotiation",
  "trading",
  "economy balancing",
  "shopkeeping",
  "bidding and auctions",
  "territory control",
  "area denial",
  "map conquest",
  "risk reward extraction",
  "looting",
  "scavenging",
  "exploration",
  "fog of war discovery",
  "map annotation",
  "clue gathering",
  "deduction",
  "evidence linking",
  "puzzle solving",
  "pattern matching",
  "logic grids",
  "code breaking",
  "lockpicking",
  "physics interactions",
  "object manipulation",
  "time manipulation",
  "rewind and retry",
  "rhythm timing",
  "beat matching",
  "quick reaction inputs",
  "precision platforming",
  "momentum movement",
  "grappling hook traversal",
  "wall running",
  "parkour chaining",
  "vehicle handling",
  "drifting",
  "route optimization",
  "traffic weaving",
  "animal taming",
  "creature collection",
  "breeding",
  "farming loops",
  "planting and harvesting",
  "weather adaptation",
  "seasons affecting gameplay",
  "terraforming",
  "ecosystem balancing",
  "infection spread management",
  "crowd control",
  "escort protection",
  "convoy management",
  "hide and seek asymmetry",
  "asymmetric roles",
  "co-op synergy abilities",
  "local co-op coordination",
  "multiplayer betrayal",
  "raid mechanics",
  "threat escalation",
  "extraction and escape",
  "timed expeditions",
  "day night cycle pressure",
  "scheduling and time slots",
  "shift management",
  "office workflow optimization",
  "task prioritization",
  "queue management",
  "customer service juggling",
  "branching endings",
  "narrative assembly",
  "memory reconstruction",
  "photo investigation",
  "surveillance monitoring",
  "signal tracking",
  "hacking minigames",
  "network routing",
  "drone control",
  "programming logic",
  "spell combining",
  "elemental reactions",
  "summon management",
  "ritual preparation",
  "corruption management",
  "sanity management",
  "fear avoidance",
  "hiding and evasion",
  "chase escape loops",
  "disguise systems",
  "identity swapping",
  "courtroom argument building",
  "debate battles",
  "document inspection",
  "blueprint planning",
  "modular building",
  "destruction physics",
  "salvage and repair",
  "recycling loops",
  "mutation evolution",
  "adaptation choices",
  "card battler synergy",
  "autobattler positioning",
  "formation building",
  "battlefield terrain use",
  "flanking",
  "morale systems",
  "diplomacy systems",
  "voting and influence",
  "kingdom management",
  "law or policy setting",
  "empire expansion",
  "research trees",
  "technology progression",
  "archaeology excavation",
  "museum curation",
  "collection completion",
  "delivery routing",
  "photography scoring",
  "performance scoring",
  "combo score chasing",
  "leaderboard competition",
  "hidden role objectives",
  "secret objective management",
  "metaprogression",
  "prestige resets",
  "idle income generation",
  "clicker scaling",
  "incremental optimization",
] as const;

const featuresOptions = [
  "branching dialogue",
  "branching endings",
  "multiple endings",
  "meaningful choices",
  "procedural generation",
  "handcrafted levels",
  "randomized events",
  "dynamic weather",
  "day night cycle",
  "seasonal changes",
  "destructible environments",
  "base customization",
  "character customization",
  "class customization",
  "weapon customization",
  "vehicle customization",
  "home decoration",
  "photo mode",
  "companion system",
  "romance options",
  "faction system",
  "reputation system",
  "morality system",
  "sanity system",
  "corruption system",
  "stress system",
  "relationship system",
  "trust system",
  "betrayal system",
  "hidden trait system",
  "skill trees",
  "perk system",
  "talents and upgrades",
  "metaprogression",
  "new game plus",
  "permadeath mode",
  "hardcore mode",
  "endless mode",
  "challenge modes",
  "daily runs",
  "weekly challenges",
  "leaderboards",
  "speedrun support",
  "accessibility options",
  "remappable controls",
  "difficulty modifiers",
  "adaptive difficulty",
  "co-op multiplayer",
  "local co-op",
  "online co-op",
  "competitive multiplayer",
  "asynchronous multiplayer",
  "couch multiplayer",
  "drop-in drop-out co-op",
  "voice acted dialogue",
  "environmental storytelling",
  "lore discovery",
  "codex or journal",
  "map annotation",
  "ping system",
  "fast travel",
  "secret areas",
  "hidden collectibles",
  "side quests",
  "optional bosses",
  "crafting stations",
  "trading system",
  "player economy",
  "NPC schedules",
  "dynamic world events",
  "emergent encounters",
  "territory control",
  "settlement upgrades",
  "town building",
  "colony growth",
  "automation tools",
  "mod support",
  "workshop integration",
  "replay theater",
  "spectator mode",
  "streaming integration",
  "community sharing",
  "level editor",
  "scenario editor",
  "map editor",
  "custom difficulty presets",
  "randomizer mode",
  "mutators",
  "card synergies",
  "combo scoring",
  "style ranking",
  "stealth indicators",
  "clue board",
  "evidence wall",
  "detective notebook",
  "radio chatter",
  "surveillance cameras",
  "drone scouting",
  "hacking minigames",
  "lockpicking minigames",
  "fishing minigame",
  "cooking minigame",
  "gardening",
  "farming",
  "pet companion",
  "mount system",
  "creature taming",
  "breeding system",
  "museum or archive building",
  "collection log",
  "achievement hunting",
  "bounty board",
  "contracts system",
  "job board",
  "escort missions",
  "convoy management",
  "raid events",
  "siege events",
  "boss rush mode",
  "arena mode",
  "extraction mode",
  "wave survival mode",
  "time trial mode",
  "turn replay",
  "ghost runs",
  "shared world events",
  "player housing",
  "guild or clan system",
  "diplomacy system",
  "voting system",
  "law or policy system",
  "kingdom management",
  "empire expansion",
  "research tree",
  "technology tree",
  "blueprint unlocks",
  "cosmetic unlocks",
  "transmog system",
  "disguises",
  "disguise detection",
  "courtroom sequences",
  "debate battles",
  "interrogation sequences",
  "newspaper or rumor system",
  "mail or message system",
  "memory reconstruction",
  "rewind feature",
  "time loop structure",
  "parallel paths",
  "dual protagonists",
  "asymmetric roles",
  "hidden role mode",
  "social deduction mode",
  "narrative recap",
  "end-of-day report",
  "performance grading",
  "office chaos events",
  "reactive soundtrack",
  "ambient world audio",
  "immersive UI",
  "diegetic interface",
  "minimal HUD mode",
  "colorblind options",
  "subtitle customization",
  "controller vibration cues",
  "one-handed mode",
  "save anywhere",
  "checkpoint saving",
  "cloud saves",
] as const;

const settingOptions = [
  "a haunted archipelago above a frozen sea",
  "a drowned city beneath a permanent storm",
  "a decaying space station orbiting a dead sun",
  "a remote mountain village cut off by snow",
  "a collapsing underground colony",
  "a floating chain of islands held together by ancient machines",
  "a cursed medieval kingdom",
  "a post-apocalyptic shopping mall",
  "an abandoned research facility in the arctic",
  "a neon-lit megacity ruled by rival corporations",
  "a forgotten desert empire buried by sandstorms",
  "a forest where the trees move at night",
  "a luxury train crossing a dying continent",
  "a mining town built around a bottomless crater",
  "a giant living labyrinth",
  "a flooded subway network beneath a modern city",
  "a ruined monastery on a cliff above the sea",
  "a bioengineered jungle on another planet",
  "a small town trapped in a time loop",
  "a city built inside the skeleton of a colossal beast",
  "a remote island where the tide reveals ancient ruins",
  "a war-torn borderland between collapsing nations",
  "a subterranean market lit by glowing fungi",
  "a volcanic archipelago on the brink of eruption",
  "a drifting fleet of scavenger ships",
  "a quarantined district sealed off from the world",
  "a giant vertical city with strict social tiers",
  "an ancient observatory at the edge of reality",
  "a moon colony running out of oxygen",
  "a forgotten temple complex reclaimed by nature",
  "a frozen wasteland with buried machines",
  "a sprawling caravan city that never stops moving",
  "a broken fantasy capital after the fall of its rulers",
  "a luxury resort hiding something monstrous",
  "a haunted office tower after working hours",
  "a chain of villages connected by dangerous forest roads",
  "a prison carved into an iceberg",
  "a desert convoy route filled with bandits and relics",
  "a rural farming valley under a strange red sky",
  "a giant library city where books are contraband",
  "an isolated lighthouse island",
  "a ruined amusement park",
  "a corporate underwater habitat",
  "a forgotten battlefield where the dead still march",
  "a sacred mountain filled with ancient tunnels",
  "a city where it always rains",
  "a medieval port controlled by smugglers",
  "a massive scrapyard inhabited by scavenger clans",
  "a hidden witch settlement in deep woods",
  "a train yard that serves as a survivor settlement",
  "a luxury space hotel during a systems failure",
  "an old hospital sealed after a disaster",
  "a crumbling school campus at the end of the world",
  "a nomadic desert settlement built on giant creatures",
  "a storm-battered fishing town",
  "a lawless frontier planet",
  "a retro-futurist suburb hiding government experiments",
  "an ancient city suspended over a chasm",
  "a graveyard world covered in wreckage",
  "a massive dam complex about to fail",
  "a remote oil rig in violent seas",
  "a city-sized factory that never shuts down",
  "a holy city divided by sects",
  "a long-abandoned military bunker network",
  "an overgrown botanical dome",
  "a quarantined luxury cruise ship",
  "a mountain fortress under siege",
  "a valley filled with giant bones",
  "a hidden valley of strange wildlife",
  "a research campus where reality behaves incorrectly",
  "a small roadside town along a cursed highway",
  "a dying kingdom’s last surviving fortress",
  "a sealed vault beneath a modern museum",
  "a pirate republic built from wrecked ships",
  "a retro arcade dimension",
  "a cursed theater district",
  "a frozen train stranded between settlements",
  "a seaside town preparing for an endless storm",
  "a deep cave civilization",
  "a celestial palace drifting through the clouds",
  "a forgotten colony ship",
  "an orbital prison",
  "a massive battlefield frozen in time",
  "a city rebuilt after an alien invasion",
  "an underwater trench station",
  "a dying forest inhabited by spirits",
  "a hidden monastery in the clouds",
  "a luxury apartment block during social collapse",
  "a kingdom swallowed by vines",
  "a remote canyon settlement",
  "a plague-ridden capital",
  "a volcanic mining colony",
  "a ruined biotech lab",
  "a cursed carnival",
  "a ghost town slowly being reclaimed by the desert",
  "a bunker community generations after the collapse",
  "a vertical slum beneath a rich sky city",
  "a temple city inside an active volcano",
  "a marshland full of abandoned machines",
  "a forgotten island prison",
  "a military academy during a coup",
  "a remote border checkpoint at the end of civilization",
  "a black-market port built inside sea caves",
  "a giant tree city",
  "a shattered moonbase",
  "a hidden valley beneath permanent mist",
  "a coastal city sinking into the ocean",
  "a chain of mountain monasteries connected by rope bridges",
  "a dreamlike suburb where houses rearrange themselves",
  "a wasteland highway lined with dead megaprojects",
  "a once-grand zoo reclaimed by nature",
  "a post-war city split into occupation zones",
  "a glacier tomb full of preserved horrors",
  "a remote communications outpost",
  "a buried city uncovered by a drought",
  "a farming commune after first contact",
  "a giant observatory city tracking an approaching object",
  "a ritual site spread across several islands",
  "a retro spaceport on the fringe of known space",
  "a derelict mall converted into a fortress",
  "a mountain pass haunted by old battles",
  "a deep-sea colony with failing lights",
  "a desert city fueled by salvage",
  "a university campus during a supernatural event",
  "a hidden rebel base in swamp ruins",
  "a forgotten castle converted into worker housing",
  "a mechanical city powered by a dying core",
] as const;

const moodOptions = [
  "eerie but hopeful",
  "bleak and oppressive",
  "cozy and comforting",
  "tense and claustrophobic",
  "melancholic and reflective",
  "darkly funny",
  "unsettling and mysterious",
  "lonely and atmospheric",
  "chaotic and absurd",
  "calm and meditative",
  "vibrant and adventurous",
  "grim and hopeless",
  "warm and nostalgic",
  "paranoid and unstable",
  "playful and mischievous",
  "eerie and dreamlike",
  "harsh and unforgiving",
  "uplifting and triumphant",
  "anxious and suspenseful",
  "bittersweet and human",
  "intimate and personal",
  "eerie and quiet",
  "energetic and rebellious",
  "strange and hypnotic",
  "sorrowful and haunting",
  "whimsical and surreal",
  "emotionally raw",
  "cold and distant",
  "frantic and stressful",
  "peaceful but uncanny",
  "sentimental and tender",
  "oppressive and violent",
  "reflective and lonely",
  "cozy but strange",
  "mysterious and sacred",
  "gritty and desperate",
  "moody and rain-soaked",
  "tragic and beautiful",
  "charming and offbeat",
  "eerie and reverent",
  "savage and relentless",
  "hopeful in the face of ruin",
  "soft and intimate",
  "eerie and fragile",
  "magical and uplifting",
  "dry and satirical",
  "weird and uncomfortable",
  "desperate but determined",
  "cursed and foreboding",
  "dreamy and melancholic",
  "rebellious and youthful",
  "isolated and fearful",
  "sorrowful but warm",
  "eerie and elegant",
  "raw and chaotic",
  "awkward and funny",
  "gentle and bittersweet",
  "dread-filled and slow-burning",
  "romantic and wistful",
  "grimly determined",
  "spiritual and mysterious",
  "innocent and eerie",
  "brutal and high-pressure",
  "contemplative and still",
  "anxious but exciting",
  "weighty and serious",
  "bizarre and playful",
  "off-kilter and uneasy",
  "mournful and poetic",
  "cozy and magical",
  "tragic but hopeful",
  "dread-filled and oppressive",
  "campy and spooky",
  "fragile and emotional",
  "sharp and confrontational",
  "dreamy and otherworldly",
  "rugged and lonely",
  "eerie and nostalgic",
  "quietly devastating",
  "moody and introspective",
  "lively and inviting",
  "eerie and sorrowful",
  "solemn and heavy",
  "playful but threatening",
  "oddly comforting",
  "cynical and biting",
  "reverent and ancient",
  "stressful and overwhelming",
  "brave and heartfelt",
  "somber and reflective",
  "quietly hopeful",
  "surreal and disorienting",
  "threatening and unstable",
  "magical and mysterious",
  "grimy and decayed",
  "theatrical and dramatic",
  "humorous and chaotic",
  "low-key and human",
  "ominous and slow-burning",
  "radiant and inspiring",
  "eerie and delicate",
  "bone-tired and hopeless",
  "wonder-filled and strange",
  "isolated but beautiful",
  "heartfelt and comedic",
  "reflective and bittersweet",
  "dreamlike and sacred",
  "suspenseful and oppressive",
  "strange but cozy",
  "nostalgic and haunting",
  "fierce and empowering",
  "eerie and rain-drenched",
  "mythic and reverent",
  "absurd and tragic",
  "intimate and unsettling",
  "lighthearted and adventurous",
  "meditative and lonely",
  "corrupted and mournful",
  "mysterious and emotional",
  "weary and desperate",
  "beautiful but doomed",
  "tender and strange",
  "atmospheric and foreboding",
  "eerie and intimate",
  "shadowy and elegant",
  "chaotic but joyful",
  "dark and mythic",
  "claustrophobic and paranoid",
  "reflective and sacred",
  "playful and eerie",
  "stressful but satisfying",
  "grim and grounded",
  "wistful and magical",
] as const;

const twistOptions = [
  "every run rewrites the town's history",
  "the world changes based on what the player refuses to do",
  "the main enemy is trying to save the world",
  "your companion is secretly building a version of you",
  "every death permanently changes one important NPC",
  "the map is alive and learns your habits",
  "you are rebuilding the place you destroyed in the prologue",
  "each victory makes the next area morally worse",
  "the game world only exists while people remember it",
  "the monsters are failed versions of the player",
  "your tools become less reliable as you grow stronger",
  "every major choice deletes another possible future",
  "the player character is the final boss in another timeline",
  "the town celebrates disasters because they reset social status",
  "every lie you tell becomes physically real",
  "the world gets safer but sadder when you succeed",
  "the main quest is a trap made by your future self",
  "each ally is hiding a different version of the truth",
  "the game begins after the chosen hero already failed",
  "resources are generated by sacrificing memories",
  "the world is being patched like broken software",
  "the player is unknowingly training the villain",
  "every boss protects something peaceful",
  "the “safe zone” is causing the apocalypse",
  "the dead can vote on what happens next",
  "your upgrades slowly erase your humanity",
  "every act of kindness empowers a hidden threat",
  "the setting resets every night but your relationships do not",
  "the game’s narrator is editing events in real time",
  "the player is actually the haunting",
  "your mission was written by the enemy to shape you",
  "every map is a reconstruction by an unreliable witness",
  "the game economy is powered by stolen time",
  "the world is physically built from abandoned plans",
  "your character’s body belongs to someone else",
  "every checkpoint revives something that should stay buried",
  "the last surviving city is fake",
  "the people you save become future antagonists",
  "each region is controlled by a different law of reality",
  "your inventory is sentient and manipulates your decisions",
  "the cure is worse than the disease but visibly kinder",
  "the “monster attacks” are evacuation attempts",
  "each run starts from a different person’s memory",
  "the game’s gods are dead but still issuing orders",
  "every collectible is part of a cover-up",
  "the central mystery only exists because of your previous playthroughs",
  "the player is preserving a world that wants to end",
  "success makes the final choice harder, not easier",
  "your home base is secretly moving",
  "the war ended long ago but nobody updated the system",
  "the player’s shadow acts independently at night",
  "each boss fight repairs part of the world and breaks another",
  "your character is famous for something they never did",
  "every side quest is secretly evidence in a trial",
  "the world was designed as a rehearsal for a real disaster",
  "the game’s weather is controlled by public emotion",
  "each companion can replace you if you fail enough",
  "the villain is preventing a worse version of you from returning",
  "the map exists inside a giant machine that is waking up",
  "your faction only survives if you become what you hate",
  "the place you are escaping is safer than the outside world",
  "every area is somebody’s unfinished afterlife",
  "your saves are canon and being discovered by NPCs",
  "each enemy type is adapted from a discarded mechanic",
  "the game’s prophecy was written after the events already happened",
  "time travel is possible but only through inherited objects",
  "your character was assembled from multiple missing people",
  "each major system is maintained by one exhausted NPC",
  "the “treasure” is a sealed apology",
  "the player’s choices are being sold to the highest bidder",
  "every law in the city was made to contain one child",
  "your rival remembers every failed run",
  "the final objective has already been completed by someone else",
  "every improvement to the town awakens an older debt",
  "the player is the backup plan, not the hero",
  "all major factions are using the same secret playbook",
  "your successes are being staged for an audience",
  "the world is held together by one repeated lie",
  "every act of revenge makes history less accurate",
  "each biome is grown from a different emotion",
  "your body upgrades are installed by an enemy cult",
  "the player’s missing memories are physically scattered across the map",
  "every hidden room is a previous version of the game world",
  "the moon is an archive, not a celestial body",
  "your objective was already abandoned by everyone else",
  "each rescue mission removes one comforting illusion",
  "the town’s founder is still alive and deeply ashamed",
  "the monsters only attack when observed",
  "every act of progress burns a piece of the map behind you",
  "your guidebook is being written by the final survivor",
  "the player’s reputation is inherited, not earned",
  "every miracle comes from somewhere horrible",
  "your allies are competing over how your story ends",
  "the game world is built from rehearsed grief",
  "every key location is a failed attempt at utopia",
  "your role was randomly assigned but everyone assumes destiny",
  "the player can win early, but only by misunderstanding the problem",
  "each upgrade path is sponsored by a hidden faction",
  "your home village is a controlled experiment",
  "every puzzle was designed to test someone who never arrived",
  "the player’s bloodline is a legal contract",
  "the game’s final door opens only after enough mercy",
  "your reflection is completing a parallel campaign",
  "every civilization in the setting copied the same original mistake",
  "the player is restoring something that should remain lost",
  "the game’s relics are prototypes from the future",
  "every major celebration hides a ritual sacrifice",
  "your main source of power is someone else’s prison",
  "the city’s layout is based on a confession",
  "every act of hope is monitored by the system",
  "your current mission was originally a punishment",
  "the thing hunting you is trying to return your identity",
  "each chapter belongs to a different failed solution",
  "the world’s best ending depends on a small act of cowardice",
  "every settlement is built around a different form of denial",
  "the game’s rules were negotiated, not natural",
  "your party members are all survivors of your other selves",
  "the “legendary weapon” is just excellent propaganda",
  "each safe house is less real than the last",
  "your objective keeps surviving by changing its meaning",
  "the ruins are newer than the city",
  "every boss arena was once a place of celebration",
  "the entire setting was funded by a private grudge",
  "the apocalypse is old, but your panic is new",
  "each zone is a memory edited for public use",
  "your job only exists because nobody admitted the truth",
  "the final threat was created by a successful tutorial",
] as const;

const hookOptions = [
  "players weaponize weather to solve social conflicts",
  "every run permanently rewrites the town’s history",
  "you rebuild a world that becomes sadder as it gets safer",
  "your shadow plays a second hidden game beside you",
  "every ally can replace you if you fail enough",
  "the world only exists while people remember it",
  "your inventory argues with your decisions",
  "each victory heals one part of the world and ruins another",
  "you are restoring a city built inside a giant corpse",
  "the safe zone is secretly causing the disaster",
  "every major upgrade costs a memory",
  "your home base is moving and hiding it from you",
  "the monsters are failed versions of the hero",
  "every checkpoint revives something that should stay dead",
  "the game economy runs on stolen time",
  "your reflection is completing a parallel campaign",
  "the final boss is a future version of the player",
  "your town survives by celebrating catastrophe",
  "every biome is grown from a different emotion",
  "the player is unknowingly training the villain",
  "every hidden room is a previous version of the world",
  "the city’s laws were built to contain one child",
  "you can win early only by misunderstanding the real problem",
  "each boss protects something beautiful",
  "the apocalypse happened long ago, but the system never noticed",
  "every act of kindness empowers a hidden threat",
  "your power source is someone else’s prison",
  "each region runs on a different law of reality",
  "the player is the haunting",
  "your guidebook is being written by the final survivor",
  "every miracle comes from somewhere terrible",
  "the world resets nightly, but relationships persist",
  "the game’s relics are prototypes from the future",
  "all progress burns part of the map behind you",
  "your character’s body belongs to someone else",
  "every puzzle was designed for someone who never arrived",
  "your rival remembers every failed run",
  "the legendary weapon is just excellent propaganda",
  "each safe house is less real than the last",
  "your choices are being sold to unseen spectators",
  "the moon is an archive, not a moon",
  "you are rebuilding the place you destroyed",
  "every law in the city was negotiated, not natural",
  "your story is famous for something you never did",
  "every settlement is built around a different denial",
  "your companions are survivors of your other selves",
  "each rescue removes one comforting illusion",
  "the weather changes based on public emotion",
  "each chapter is a different failed solution to the same problem",
  "the player can only time travel through inherited objects",
  "the world is physically assembled from abandoned plans",
  "every collectible is part of a cover-up",
  "your faction survives only if you become what you hate",
  "your upgrades slowly erase your humanity",
  "the final objective has already been completed by someone else",
  "your job exists because no one admitted the truth",
  "every zone is a memory edited for public use",
  "the city layout is based on a confession",
  "every celebration hides a sacrifice",
  "the game’s narrator is editing events live",
  "the player’s bloodline is a legal contract",
  "the world is a rehearsal for a real catastrophe",
  "each side quest is evidence in a trial",
  "all major factions are using the same secret script",
  "every act of revenge makes history less accurate",
  "the player is preserving a world that wants to die",
  "every act of hope is monitored by the system",
  "your current mission began as a punishment",
  "the ruins are newer than the city",
  "every boss arena used to be a place of joy",
  "your objective survives by changing its meaning",
  "the world’s best ending requires a small act of cowardice",
  "the player’s reputation is inherited, not earned",
  "each zone is a failed utopia with one brilliant idea left",
  "your allies are competing over how your story ends",
  "the monsters attack only when observed",
  "your save files are canon and NPCs are finding them",
  "each civilization copied the same original mistake",
  "the player restores something that should remain buried",
  "the town founder is alive and deeply ashamed",
  "your role was randomly assigned but everyone insists it is destiny",
  "every law of the world was written by exhausted survivors",
  "your upgrades are sponsored by hidden factions",
  "the player character is famous, broke, and completely replaceable",
  "the city survives by outsourcing guilt",
  "your base-building game is really about controlled collapse",
  "your farming sim is about raising crops in cursed soil",
  "your co-op game is about covering up each other’s mistakes",
  "your horror game gets easier when the player is kinder",
  "your detective game changes the crime every time you get close",
  "your strategy game is about managing a kingdom that should not exist",
  "your survival game rewards comfort and punishes panic",
  "your life sim takes place in the last stable week before collapse",
  "your colony sim is run by people who know the colony already failed",
  "your extraction game is about stealing back your own future",
  "your office sim is secretly an apocalyptic logistics game",
  "your roguelite is built around inherited shame",
  "your creature collector is about rehabilitating sacred monsters",
  "your crafting game uses emotional states as raw materials",
  "your city builder is about maintaining a lie the population needs",
  "your puzzle game is about repairing a broken memory palace",
  "your immersive sim is set in a city-sized apology",
  "your management sim is about keeping a failing miracle alive",
  "your social sim lets rumors physically reshape the town",
  "your action game rewards retreat more than aggression",
  "your adventure game happens inside a machine learning your grief",
  "your stealth game is about being forgotten rather than unseen",
  "your RPG is about replacing a hero who refused the story",
  "your world is alive, embarrassed, and trying to improve",
  "the player is not chosen, just available",
  "each successful mission quietly worsens the ending",
  "the game’s happiest systems create its darkest consequences",
  "your mission is to maintain something nobody believes in anymore",
  "the player can only save the world by making it smaller",
  "every improvement reveals a worse original purpose",
  "the game treats mercy like a high-skill mechanic",
  "the thing hunting you is trying to return your identity",
  "every reward is a confession from the world",
  "the final threat was created by a successful tutorial",
] as const;

const audienceAngleOptions = [
  "great for cozy sim fans who want more stakes",
  "perfect for players who love management games with emotional pressure",
  "ideal for horror fans who prefer dread over jump scares",
  "built for strategy players who enjoy difficult tradeoffs",
  "great for people who want survival without constant punishment",
  "ideal for players who love tense systems but short sessions",
  "perfect for fans of eerie exploration and slow-burn mystery",
  "designed for players who enjoy replayability with meaningful variation",
  "great for RPG fans who want stronger atmosphere than scale",
  "ideal for players who like stories shaped by small choices",
  "built for people who love micromanagement with personality",
  "great for players who want dark themes without grimdark excess",
  "ideal for fans of weird, memorable worlds",
  "made for players who enjoy systems-driven storytelling",
  "perfect for players who want emotional tension without heavy combat",
  "great for people who love horror but still want hope",
  "built for sim players who want something stranger",
  "ideal for players who enjoy social tension as much as gameplay tension",
  "perfect for fans of immersive worldbuilding",
  "made for players who like mechanics that reflect the story",
  "great for players who want a strong hook immediately",
  "designed for people who enjoy narrative concepts with marketable twists",
  "ideal for fans of cozy games with unsettling undertones",
  "built for players who like pressure, but not chaos",
  "great for players who enjoy dark humor and grounded absurdity",
  "perfect for players who want high concept ideas with emotional grounding",
  "made for people who love management loops with strong themes",
  "ideal for players who like clean mechanics with strong atmosphere",
  "built for players who want a game that is easy to pitch but rich in detail",
  "great for fans of lonely, reflective experiences",
  "perfect for players who enjoy harsh worlds with soft emotional cores",
  "ideal for players who like problem-solving under pressure",
  "made for fans of survival games with more meaning and less grind",
  "built for players who enjoy systems that fight back",
  "great for players who want mystery woven into the main loop",
  "ideal for fans of mood-first game concepts",
  "designed for players who enjoy hostile worlds and human stories",
  "perfect for people who like strategic planning with emotional consequences",
  "built for players who enjoy progression that changes the world around them",
  "great for players who want more tension in their cozy games",
  "ideal for players who love unsettling but beautiful settings",
  "made for players who enjoy replayable structures without repetitive feeling",
  "built for people who like games with strong internal logic",
  "perfect for players who want ideas that feel fresh but still grounded",
  "great for fans of dark fantasy without generic tropes",
  "ideal for players who enjoy morally messy decision-making",
  "built for players who like strange systems explained through play",
  "great for people who enjoy games that feel personal and reactive",
  "perfect for players who want emotional payoff from mechanics",
  "made for fans of atmospheric games with real gameplay teeth",
  "built for players who want a game that feels both marketable and distinct",
  "ideal for people who enjoy emergent storytelling",
  "great for players who like dread that builds slowly",
  "perfect for fans of tactical tension over raw speed",
  "made for players who enjoy narrative hooks with gameplay consequences",
  "built for sim fans who want stronger identity and tone",
  "ideal for players who like worlds that feel lived in and damaged",
  "great for people who enjoy awkward, funny, and human writing",
  "perfect for players who like systems that reward observation",
  "made for fans of choice-driven design without fake choices",
  "built for players who enjoy resource pressure with emotional weight",
  "ideal for players who prefer consequence over spectacle",
  "great for players who enjoy niche concepts with broad appeal",
  "perfect for fans of unusual jobs turned into compelling loops",
  "built for players who like high tension in contained spaces",
  "ideal for players who enjoy layered concepts that are still easy to understand",
  "made for fans of gameplay-first concepts with strong themes",
  "built for players who want more identity in procedural games",
  "great for players who enjoy games about maintenance, collapse, and adaptation",
  "ideal for fans of strategy games with personal stakes",
  "perfect for players who enjoy strong moods and memorable hooks",
  "made for players who like games that feel fresh in one sentence",
  "built for players who enjoy dynamic systems and reactive consequences",
  "great for people who like management games that go wrong",
  "ideal for players who want discomfort without misery",
  "made for fans of subtle horror and grounded weirdness",
  "built for players who enjoy making the best of bad situations",
  "great for players who like stories about surviving systems, not just enemies",
  "perfect for people who enjoy games with a clear audience promise",
  "made for players who want concepts that instantly spark follow-up questions",
  "built for fans of mechanically clear but tonally rich games",
  "ideal for players who enjoy conceptual twists that affect play, not just story",
  "great for people who want stronger player fantasy without losing grounded stakes",
  "perfect for fans of emotional simulation and social pressure",
  "built for players who enjoy unusual combinations that still make sense",
  "ideal for players who want friction, but not frustration",
  "made for fans of games that feel handcrafted even when systemic",
  "built for players who enjoy consequence-heavy progression",
  "great for players who prefer compact scope with strong identity",
  "perfect for people who enjoy games that can be sold in one sentence and explored for hours",
  "made for players who like immersive ideas without bloated complexity",
  "built for fans of genre blends that feel intentional",
  "ideal for players who enjoy discovering what is wrong with a place",
  "great for players who want gameplay loops with emotional context",
  "perfect for people who like tension built from responsibility",
  "made for fans of concepts that feel both familiar and strange",
  "built for players who enjoy slow pressure rather than constant noise",
  "ideal for players who want more emotional texture in systemic games",
  "great for people who like weird ideas that still feel commercial",
  "perfect for players who enjoy trying to hold something broken together",
  "made for fans of strong settings that shape the play experience",
  "built for players who want more than pure efficiency from a sim",
  "ideal for players who enjoy being forced to adapt without total randomness",
  "perfect for fans of games where the tone matters as much as the loop",
  "made for players who like difficult worlds with compassionate details",
  "built for people who want game ideas that stand out without becoming nonsense",
  "ideal for players who enjoy a clear fantasy with deeper complications underneath",
  "great for fans of games that feel sharp, weird, and emotionally readable",
] as const;

const perspectiveOptions = [
  "first-person",
  "third-person",
  "top-down",
  "isometric",
  "side-scrolling",
  "2D side view",
  "2.5D",
  "fixed camera",
  "over-the-shoulder",
  "first-person with limited visibility",
  "first-person immersive sim view",
  "first-person cockpit view",
  "first-person bodycam style",
  "first-person found-footage style",
  "first-person surveillance style",
  "third-person action camera",
  "third-person cinematic camera",
  "third-person trailing camera",
  "third-person fixed-distance camera",
  "top-down tactical view",
  "top-down twin-stick view",
  "top-down management view",
  "isometric tactical view",
  "isometric city-builder view",
  "side-view platformer perspective",
  "side-view cinematic platformer perspective",
  "side-view combat brawler perspective",
  "overhead strategy view",
  "overhead god-game view",
  "overhead colony sim view",
  "map-based perspective",
  "room-by-room fixed-angle perspective",
  "point-and-click adventure framing",
  "visual novel presentation",
  "text-led perspective with illustrated scenes",
  "split-screen co-op view",
  "asymmetrical split perspective",
  "first-person exploration with UI diegetically in-world",
  "third-person exploration with close environmental framing",
  "third-person with dramatic zoom-ins",
  "low-angle cinematic third-person",
  "distant survival camera",
  "claustrophobic close-follow camera",
  "zoomed-out sandbox camera",
  "zoomed-out tactical battlefield camera",
  "board-game style overhead view",
  "dollhouse cutaway view",
  "cross-section management view",
  "side-on colony sim view",
  "orthographic strategy view",
  "diagonal tactical view",
  "on-rails first-person",
  "on-rails cinematic perspective",
  "stationary observation perspective",
  "security-monitor perspective",
  "drone-camera perspective",
  "bodycam horror perspective",
  "helmet-cam perspective",
  "document-desk perspective",
  "desktop simulation perspective",
  "dashboard interface perspective",
  "train-window travel perspective",
  "vehicle-mounted perspective",
  "cockpit management perspective",
  "first-person puzzle-box perspective",
  "third-person parkour camera",
  "chase-cam racing perspective",
  "arcade cabinet presentation",
  "retro CRT display framing",
  "handheld camera perspective",
  "storybook framed perspective",
  "stage-play presentation",
  "comic-panel presentation",
  "diorama-style perspective",
  "miniature-world perspective",
  "table-scale tactics perspective",
  "first-person with mirrored reflection cues",
  "first-person with diegetic hands-and-tools focus",
  "third-person with squad-command overlay",
  "top-down with fog-of-war discovery",
  "isometric with layered verticality",
  "side-view with foreground obstruction",
  "observer perspective from control room feeds",
  "spectating through magical scrying view",
  "surveillance grid perspective",
  "mixed first-person and static camera transitions",
  "mixed top-down and close-up interaction view",
  "first-person exploration with occasional out-of-body cuts",
  "third-person with choice-driven cinematic framing",
  "distant god's-eye view",
  "intimate shoulder-level perspective",
  "panoramic traversal perspective",
  "confined tunnel-view perspective",
  "first-person with narrow flashlight framing",
  "top-down with rotating camera",
  "isometric with free camera pivot",
  "tactical pause overview camera",
  "free-fly builder camera",
  "city planner overhead perspective",
  "colony sim layered map perspective",
  "museum display presentation",
  "courtroom bench perspective",
  "interrogation-room fixed camera",
  "side-view management dashboard hybrid",
  "first-person with static security interruptions",
  "over-map expedition perspective",
  "postcard-like scenic framing",
  "dreamlike floating camera",
  "fragmented perspective shifting by zone",
  "perspective changes based on stress or sanity",
  "perspective changes between player and shadow",
  "dual protagonist alternating perspective",
  "split reality double-frame perspective",
] as const;

const fieldConfigs: Array<{
  key: IdeaFieldKey;
  label: string;
  placeholder: string;
  helperText?: string;
}> = [
  { key: "genre", label: "Genre", placeholder: "e.g. Action, RPG, Survival" },
  {
    key: "playerAction",
    label: "Player Action",
    placeholder: "e.g. rebuild drifting sky settlements",
    helperText: "What does or should the player do in the game?",
  },
  {
    key: "coreMechanics",
    label: "Core Mechanics",
    placeholder: "e.g. deckbuilding, crafting, and timed expeditions",
    helperText: "What is the main system or gameplay loop that drives the experience?",
  },
  {
    key: "features",
    label: "Features",
    placeholder: "e.g. faction rivalries, weather events, and companion stories",
    helperText:
      "What extra systems, modes, or standout elements make the game more distinctive?",
  },
  {
    key: "setting",
    label: "Setting",
    placeholder: "e.g. a haunted archipelago above a frozen sea",
    helperText:
      "Where does the game take place, and what kind of world or environment is it set in?",
  },
  {
    key: "mood",
    label: "Mood",
    placeholder: "e.g. eerie but hopeful",
    helperText: "What emotional tone or feeling should the game give the player?",
  },
  {
    key: "twist",
    label: "Twist",
    placeholder: "e.g. every run rewrites the town's history",
    helperText:
      "What unexpected angle, reversal, or special complication makes the concept feel fresh?",
  },
  {
    key: "hook",
    label: "Hook",
    placeholder: "e.g. players weaponize weather to solve social conflicts",
    helperText:
      "What is the instantly interesting angle or standout idea that makes someone care right away?",
  },
  {
    key: "audienceAngle",
    label: "Audience Angle",
    placeholder: "e.g. great for cozy sim fans who want more stakes",
    helperText:
      "Who is this game especially for, and what kind of player would be most drawn to it?",
  },
  {
    key: "perspective",
    label: "Perspective",
    placeholder: "e.g. First-person, Third-person, Top-down, Isometric",
    helperText:
      "From what viewpoint or presentation style does the player experience the game?",
  },
];

const fieldSuggestions: Record<IdeaFieldKey, string[]> = {
  genre: [...genreOptions],
  playerAction: [...playerActionOptions],
  coreMechanics: [...coreMechanicsOptions],
  features: [...featuresOptions],
  setting: [...settingOptions],
  mood: [...moodOptions],
  twist: [...twistOptions],
  hook: [...hookOptions],
  audienceAngle: [...audienceAngleOptions],
  perspective: [...perspectiveOptions],
};

const emptyFormState: IdeaFormState = {
  genre: "",
  playerAction: "",
  coreMechanics: "",
  features: "",
  setting: "",
  mood: "",
  twist: "",
  hook: "",
  audienceAngle: "",
  perspective: "",
  customIdea: "",
};

function getFallbackValue(key: IdeaFieldKey) {
  return fieldSuggestions[key][0];
}

function getNextSuggestion(currentValue: string, suggestions: string[]) {
  const normalizedCurrentValue = currentValue.trim().toLowerCase();
  const currentIndex = suggestions.findIndex(
    (suggestion) => suggestion.toLowerCase() === normalizedCurrentValue
  );

  if (currentIndex === -1 || currentIndex === suggestions.length - 1) {
    return suggestions[0];
  }

  return suggestions[currentIndex + 1];
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function splitGenreSegments(value: string) {
  const segments: string[] = [];
  let currentSegment = "";
  let parenthesisDepth = 0;

  for (const character of value) {
    if (character === "(") {
      parenthesisDepth += 1;
      currentSegment += character;
      continue;
    }

    if (character === ")") {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      currentSegment += character;
      continue;
    }

    if (character === "," && parenthesisDepth === 0) {
      segments.push(currentSegment);
      currentSegment = "";
      continue;
    }

    currentSegment += character;
  }

  segments.push(currentSegment);
  return segments;
}

function splitGenreDraft(value: string) {
  const segments = splitGenreSegments(value);

  if (segments.length === 0) {
    return { completed: [], pending: "" };
  }

  return {
    completed: segments.slice(0, -1),
    pending: segments[segments.length - 1] ?? "",
  };
}

function normalizeGenre(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeGenreTags(existingTags: string[], incomingGenres: string[]) {
  const nextTags = [...existingTags];
  let overflow = false;

  for (const incomingGenre of incomingGenres) {
    const normalizedGenre = normalizeGenre(incomingGenre);
    if (!normalizedGenre) {
      continue;
    }

    const alreadySelected = nextTags.some(
      (existingGenre) => existingGenre.toLowerCase() === normalizedGenre.toLowerCase()
    );

    if (alreadySelected) {
      continue;
    }

    if (nextTags.length >= 3) {
      overflow = true;
      continue;
    }

    nextTags.push(normalizedGenre);
  }

  return {
    nextTags,
    overflow,
  };
}

function parseGenres(value: string) {
  return splitGenreSegments(value)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getPrimaryGenre(value: string) {
  return parseGenres(value)[0] || getFallbackValue("genre");
}

function formatSelectedGenres(value: string) {
  const genres = parseGenres(value);
  return genres.length > 0 ? genres.join(", ") : getFallbackValue("genre");
}

function buildVisibleGenreTags(confirmedTags: string[], previewTag: string | null) {
  return previewTag ? [...confirmedTags, previewTag] : confirmedTags;
}

function resolveIdeaInputs(values: IdeaFormState) {
  return {
    genre: formatSelectedGenres(values.genre),
    playerAction: values.playerAction.trim() || getFallbackValue("playerAction"),
    coreMechanics: values.coreMechanics.trim() || getFallbackValue("coreMechanics"),
    features: values.features.trim() || getFallbackValue("features"),
    setting: values.setting.trim() || getFallbackValue("setting"),
    mood: values.mood.trim() || getFallbackValue("mood"),
    twist: values.twist.trim() || getFallbackValue("twist"),
    hook: values.hook.trim() || getFallbackValue("hook"),
    audienceAngle: values.audienceAngle.trim() || getFallbackValue("audienceAngle"),
    perspective: values.perspective.trim() || getFallbackValue("perspective"),
    customIdea: values.customIdea.trim(),
  };
}

function buildGeneratedIdeas(values: IdeaFormState): GeneratedIdea[] {
  const resolved = resolveIdeaInputs(values);
  const primaryGenre = getPrimaryGenre(values.genre);
  const customIdeaLine = resolved.customIdea
    ? ` It also leans into your manual idea: ${resolved.customIdea}.`
    : "";

  return [
    {
      label: "Generated Idea One",
      title: `${toTitleCase(primaryGenre.split(" ").slice(0, 2).join(" "))} Horizon`,
      description: `A ${resolved.genre} ${resolved.perspective} game where players ${resolved.playerAction} across ${resolved.setting}. The core loop combines ${resolved.coreMechanics}, while ${resolved.features} keep each session fresh. The hook is that ${resolved.hook}, and the twist is ${resolved.twist}.${customIdeaLine}`,
      positioning: `Designed to feel ${resolved.mood}, with a clear pitch for ${resolved.audienceAngle} and room for memorable long-term progression.`,
    },
    {
      label: "Generated Idea Two",
      title: `${toTitleCase(resolved.setting.split(" ").slice(-2).join(" "))} Protocol`,
      description: `This version reframes the concept around stronger escalation: in a ${resolved.perspective} view, players ${resolved.playerAction}, but the main tension comes from ${resolved.coreMechanics}. ${toTitleCase(resolved.features)} create the standout differentiator, the world stays rooted in ${resolved.setting}, and ${resolved.twist} keeps the concept surprising.${customIdeaLine}`,
      positioning: `A slightly sharper take for teams that want a concept with clearer marketable pillars, a ${resolved.mood} tone, and a stronger appeal for ${resolved.audienceAngle}.`,
    },
  ];
}

function buildIdeaGenerationPayload(values: IdeaFormState): IdeaFormState {
  return {
    genre: values.genre.trim(),
    playerAction: values.playerAction.trim(),
    coreMechanics: values.coreMechanics.trim(),
    features: values.features.trim(),
    setting: values.setting.trim(),
    mood: values.mood.trim(),
    twist: values.twist.trim(),
    hook: values.hook.trim(),
    audienceAngle: values.audienceAngle.trim(),
    perspective: values.perspective.trim(),
    customIdea: values.customIdea.trim(),
  };
}

function hasAnyIdeaInput(values: IdeaFormState) {
  return Object.values(values).some((value) => value.length > 0);
}

function isGeneratedIdeaResponseItem(value: unknown): value is GeneratedIdeaResponseItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.summary === "string" &&
    candidate.summary.trim().length > 0 &&
    typeof candidate.positioning === "string" &&
    candidate.positioning.trim().length > 0
  );
}

function isGeneratedIdeasResponse(value: unknown): value is GeneratedIdeasResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isGeneratedIdeaResponseItem(candidate.ideaOne) &&
    isGeneratedIdeaResponseItem(candidate.ideaTwo)
  );
}

function mapGeneratedIdeasResponseToCards(response: GeneratedIdeasResponse): GeneratedIdea[] {
  return [
    {
      label: "Generated Idea One",
      title: response.ideaOne.title,
      description: response.ideaOne.summary,
      positioning: response.ideaOne.positioning,
    },
    {
      label: "Generated Idea Two",
      title: response.ideaTwo.title,
      description: response.ideaTwo.summary,
      positioning: response.ideaTwo.positioning,
    },
  ];
}

function getGenerationErrorMessage(responseBody: unknown, fallbackMessage: string) {
  if (!responseBody || typeof responseBody !== "object") {
    return fallbackMessage;
  }

  const candidate = responseBody as GameIdeaGenerationErrorResponse;

  if (candidate.errorCode === "EMPTY_GAME_IDEA_INPUT") {
    return "Add at least one field before generating a game idea.";
  }

  if (candidate.errorCode === "INVALID_GAME_IDEA_JSON") {
    return "Generation returned invalid JSON. Please try again.";
  }

  if (candidate.errorCode === "INSUFFICIENT_GAME_IDEA_CREDITS") {
    return GAME_IDEA_GENERATION_CREDIT_REQUIRED_MESSAGE;
  }

  if (typeof candidate.error === "string" && candidate.error.trim().length > 0) {
    return candidate.error;
  }

  return fallbackMessage;
}

async function getGameIdeaGenerationAuthState() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const supabase = createClient();

  if (!supabase) {
    return {
      headers,
      balance: 0,
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = session?.access_token?.trim();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (!session?.user) {
    return {
      headers,
      balance: 0,
    };
  }

  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    headers,
    balance: normalizeCreditsBalance(data?.balance),
  };
}

export default function GameIdeaGeneratorPage() {
  const [formValues, setFormValues] = useState<IdeaFormState>(emptyFormState);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>(() =>
    buildGeneratedIdeas(emptyFormState)
  );
  const [genreError, setGenreError] = useState<string | null>(null);
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [genreInputValue, setGenreInputValue] = useState("");
  const [genrePreviewTag, setGenrePreviewTag] = useState<string | null>(null);
  const [genreCycleIndex, setGenreCycleIndex] = useState(0);
  const [playerActionCycleIndex, setPlayerActionCycleIndex] = useState(0);
  const [coreMechanicsCycleIndex, setCoreMechanicsCycleIndex] = useState(0);
  const [featuresCycleIndex, setFeaturesCycleIndex] = useState(0);
  const [moodCycleIndex, setMoodCycleIndex] = useState(0);
  const [twistCycleIndex, setTwistCycleIndex] = useState(0);
  const [hookCycleIndex, setHookCycleIndex] = useState(0);
  const [audienceAngleCycleIndex, setAudienceAngleCycleIndex] = useState(0);
  const [perspectiveCycleIndex, setPerspectiveCycleIndex] = useState(0);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const updateField = (key: keyof IdeaFormState, value: string) => {
    setGenerationError(null);
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePlayerActionField = (value: string) => {
    updateField("playerAction", value);
  };

  const syncGenreState = (nextTags: string[], nextPreviewTag: string | null) => {
    const visibleTags = buildVisibleGenreTags(nextTags, nextPreviewTag);

    setGenerationError(null);
    setGenreTags(nextTags);
    setGenrePreviewTag(nextPreviewTag);
    setFormValues((current) => ({
      ...current,
      genre: visibleTags.join(", "),
    }));

    return visibleTags.join(", ");
  };

  const commitGenreDraft = (draftValue: string, includePendingSegment = false) => {
    const draftParts = splitGenreDraft(draftValue);
    const incomingGenres = includePendingSegment
      ? [...draftParts.completed, draftParts.pending]
      : draftParts.completed;
    const nextMergeState = mergeGenreTags(genreTags, incomingGenres);
    const nextGenreValue = syncGenreState(nextMergeState.nextTags, null);

    setGenreInputValue(includePendingSegment ? "" : draftParts.pending);
    setGenreError(nextMergeState.overflow ? "You can only select up to 3 genres" : null);

    return {
      ...nextMergeState,
      genreValue: nextGenreValue,
    };
  };

  const handleGenreInputChange = (value: string) => {
    if (genrePreviewTag) {
      syncGenreState(genreTags, null);
    }

    if (genreTags.length >= 3 && value.trim().length > 0) {
      setGenreError("You can only select up to 3 genres");
      return;
    }

    const draftParts = splitGenreDraft(value);

    if (draftParts.completed.length === 0) {
      setGenreInputValue(value);

      if (genreError && genreTags.length < 3) {
        setGenreError(null);
      }

      return;
    }

    commitGenreDraft(value, false);
  };

  const handleGenreKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (genrePreviewTag) {
        syncGenreState(genreTags, null);
      }

      if (genreTags.length >= 3 && genreInputValue.trim().length > 0) {
        setGenreError("You can only select up to 3 genres");
        return;
      }

      commitGenreDraft(genreInputValue, true);
      return;
    }

    if (event.key === "Backspace" && genreInputValue.length === 0 && genreTags.length > 0) {
      const nextTags = genreTags.slice(0, -1);
      syncGenreState(nextTags, genrePreviewTag);
      setGenreError(null);
    }
  };

  const handleRemoveGenreTag = (tagToRemove: string) => {
    const nextTags = genreTags.filter((genre) => genre !== tagToRemove);
    syncGenreState(nextTags, genrePreviewTag);
    setGenreError(null);
  };

  const handleConfirmGenrePreview = () => {
    if (!genrePreviewTag) {
      return;
    }

    const nextTags = [...genreTags, genrePreviewTag].slice(0, 3);
    syncGenreState(nextTags, null);
    setGenreError(null);
  };

  const handleGenreGenerate = () => {
    if (genreInputValue.trim()) {
      const nextCommitState = commitGenreDraft(genreInputValue, true);

      if (nextCommitState.overflow) {
        return;
      }
    }

    if (genreTags.length >= 3 && !genrePreviewTag) {
      setGenreError("You can only select up to 3 genres");
      return;
    }

    const selectedGenres = new Set(genreTags.map((genre) => genre.toLowerCase()));
    const currentPreviewLower = genrePreviewTag?.toLowerCase() ?? null;
    let nextIndex = genreCycleIndex;
    let nextPreview: string | null = null;

    for (let attempts = 0; attempts < genreOptions.length; attempts += 1) {
      const candidate = genreOptions[nextIndex];
      nextIndex = (nextIndex + 1) % genreOptions.length;

      if (selectedGenres.has(candidate.toLowerCase())) {
        continue;
      }

      if (currentPreviewLower && candidate.toLowerCase() === currentPreviewLower) {
        continue;
      }

      nextPreview = candidate;
      break;
    }

    if (!nextPreview) {
      return;
    }

    syncGenreState(genreTags, nextPreview);
    setGenreCycleIndex(nextIndex);
    setGenreError(null);
  };

  const handleGenreInputBlur = () => {
    if (!genreInputValue.trim()) {
      return;
    }

    commitGenreDraft(genreInputValue, true);
  };

  const handleFieldGenerate = (key: IdeaFieldKey) => {
    const suggestions = fieldSuggestions[key];
    setFormValues((current) => ({
      ...current,
      [key]: getNextSuggestion(current[key], suggestions),
    }));
  };

  const handlePlayerActionGenerate = () => {
    const nextAction = playerActionOptions[playerActionCycleIndex % playerActionOptions.length];
    updateField("playerAction", nextAction);
    setPlayerActionCycleIndex((current) => current + 1);
  };

  const handleCoreMechanicsGenerate = () => {
    const nextMechanic =
      coreMechanicsOptions[coreMechanicsCycleIndex % coreMechanicsOptions.length];
    updateField("coreMechanics", nextMechanic);
    setCoreMechanicsCycleIndex((current) => current + 1);
  };

  const handleFeaturesGenerate = () => {
    const nextFeature = featuresOptions[featuresCycleIndex % featuresOptions.length];
    updateField("features", nextFeature);
    setFeaturesCycleIndex((current) => current + 1);
  };

  const handleMoodGenerate = () => {
    const nextMood = moodOptions[moodCycleIndex % moodOptions.length];
    updateField("mood", nextMood);
    setMoodCycleIndex((current) => current + 1);
  };

  const handleTwistGenerate = () => {
    const nextTwist = twistOptions[twistCycleIndex % twistOptions.length];
    updateField("twist", nextTwist);
    setTwistCycleIndex((current) => current + 1);
  };

  const handleHookGenerate = () => {
    const nextHook = hookOptions[hookCycleIndex % hookOptions.length];
    updateField("hook", nextHook);
    setHookCycleIndex((current) => current + 1);
  };

  const handleAudienceAngleGenerate = () => {
    const nextAudienceAngle =
      audienceAngleOptions[audienceAngleCycleIndex % audienceAngleOptions.length];
    updateField("audienceAngle", nextAudienceAngle);
    setAudienceAngleCycleIndex((current) => current + 1);
  };

  const handlePerspectiveGenerate = () => {
    const nextPerspective =
      perspectiveOptions[perspectiveCycleIndex % perspectiveOptions.length];
    updateField("perspective", nextPerspective);
    setPerspectiveCycleIndex((current) => current + 1);
  };

  const handleGenerateIdeas = async () => {
    let nextGenreValue = formValues.genre;

    if (genreInputValue.trim()) {
      const nextCommitState = commitGenreDraft(genreInputValue, true);

      if (nextCommitState.overflow) {
        return;
      }

      nextGenreValue = nextCommitState.genreValue;
    }

    const nextValues = buildIdeaGenerationPayload({
      ...formValues,
      genre: nextGenreValue,
    });

    if (!hasAnyIdeaInput(nextValues)) {
      setGenerationError("Add at least one field before generating a game idea.");
      return;
    }

    setIsGeneratingIdeas(true);
    setGenerationError(null);

    try {
      const { headers, balance } = await getGameIdeaGenerationAuthState();

      if (balance < 1) {
        setGenerationError(GAME_IDEA_GENERATION_CREDIT_REQUIRED_MESSAGE);
        return;
      }

      const response = await fetch("/api/game-idea-generator", {
        method: "POST",
        headers,
        body: JSON.stringify(nextValues),
      });

      let responseBody: unknown = null;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        setGenerationError(
          getGenerationErrorMessage(
            responseBody,
            "We could not generate game ideas right now. Please try again."
          )
        );
        return;
      }

      if (!isGeneratedIdeasResponse(responseBody)) {
        setGenerationError("Generation returned invalid JSON. Please try again.");
        return;
      }

      setGeneratedIdeas(mapGeneratedIdeasResponseToCards(responseBody));

      if (typeof responseBody.remainingCredits === "number") {
        dispatchCreditsBalanceUpdated({
          balance: normalizeCreditsBalance(responseBody.remainingCredits),
        });
      }
    } catch {
      setGenerationError("We could not generate game ideas right now. Please try again.");
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-3 text-blue-300">
            <Lightbulb size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Game Idea Generator</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              Mix structured prompts with your own concept notes, then generate two polished game idea directions in a layout that matches the rest of the dashboard.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          {fieldConfigs.map((field) => (
            <div key={field.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
              <label
                htmlFor={`game-idea-${field.key}`}
                className="text-xs font-black uppercase tracking-[0.22em] text-slate-500"
              >
                {field.label}
              </label>
              {field.helperText ? (
                <p className="mt-3 text-xs font-semibold leading-6 text-slate-500">
                  {field.helperText}
                </p>
              ) : null}
              {field.key === "genre" ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Genres separated by commas, up to 3 genres allowed
                  </p>
                  <div className="mt-3 flex min-h-[3.5rem] w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/30">
                    {genreTags.map((genre) => (
                      <span
                        key={genre}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200"
                      >
                        {genre}
                        <button
                          type="button"
                          onClick={() => handleRemoveGenreTag(genre)}
                          className="text-slate-400 transition hover:text-white"
                          aria-label={`Remove ${genre}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                    {genrePreviewTag ? (
                      <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-100">
                        {genrePreviewTag}
                        <button
                          type="button"
                          onClick={handleConfirmGenrePreview}
                          className="rounded-full border border-blue-400/30 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-200 transition hover:border-blue-300 hover:text-white"
                        >
                          Confirm
                        </button>
                      </span>
                    ) : null}
                    <input
                      id="game-idea-genre"
                      type="text"
                      value={genreInputValue}
                      onChange={(event) => handleGenreInputChange(event.target.value)}
                      onKeyDown={handleGenreKeyDown}
                      onBlur={handleGenreInputBlur}
                      placeholder={
                        buildVisibleGenreTags(genreTags, genrePreviewTag).length === 0
                          ? field.placeholder
                          : genreTags.length >= 3
                            ? ""
                            : "Add another genre"
                      }
                      disabled={genreTags.length >= 3}
                      className="min-w-0 basis-full flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500 sm:min-w-[10rem] sm:basis-auto"
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    OR type your own
                  </p>
                  {genreError ? (
                    <p className="mt-2 text-xs font-semibold text-rose-400">{genreError}</p>
                  ) : null}
                  <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={handleGenreGenerate}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-blue-500/40 hover:text-blue-300"
                    >
                      <RefreshCw size={15} />
                      Generate
                    </button>
                    <p className="min-w-0 text-xs font-semibold leading-5 text-slate-500">
                      Click Generate to cycle through genre ideas. Confirm your selection when you&apos;re happy with the genre(s).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <input
                    id={`game-idea-${field.key}`}
                    type="text"
                    value={formValues[field.key]}
                    onChange={(event) =>
                      field.key === "playerAction"
                        ? updatePlayerActionField(event.target.value)
                        : updateField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-500">OR type your own</p>
                  <button
                    type="button"
                    onClick={
                      field.key === "playerAction"
                        ? handlePlayerActionGenerate
                        : field.key === "coreMechanics"
                          ? handleCoreMechanicsGenerate
                          : field.key === "features"
                            ? handleFeaturesGenerate
                            : field.key === "mood"
                              ? handleMoodGenerate
                              : field.key === "twist"
                                ? handleTwistGenerate
                                : field.key === "hook"
                                  ? handleHookGenerate
                                  : field.key === "audienceAngle"
                                    ? handleAudienceAngleGenerate
                                    : field.key === "perspective"
                                      ? handlePerspectiveGenerate
                        : () => handleFieldGenerate(field.key)
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-blue-500/40 hover:text-blue-300"
                  >
                    <RefreshCw size={15} />
                    Generate
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <label
            htmlFor="game-idea-custom-idea"
            className="text-xs font-black uppercase tracking-[0.22em] text-slate-500"
          >
            Your Own Game Idea
          </label>
          <textarea
            id="game-idea-custom-idea"
            value={formValues.customIdea}
            onChange={(event) => updateField("customIdea", event.target.value)}
            placeholder="Manually add your own hook, twist, audience angle, or concept note here."
            rows={5}
            className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm leading-7 text-white placeholder:text-slate-600 focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Type your game idea if you do not want to use the above generation
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateIdeas}
          disabled={isGeneratingIdeas}
          aria-busy={isGeneratingIdeas}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:bg-blue-500/80"
        >
          <Sparkles size={18} className={isGeneratingIdeas ? "animate-pulse" : undefined} />
          {isGeneratingIdeas ? "Generating Game Ideas..." : "Generate Game Idea"}
        </button>
        <p className="mt-3 text-left text-sm leading-6 text-slate-400 sm:text-center sm:whitespace-nowrap">
          Generating the idea costs 1 credit, and you will receive 2 distinct game ideas. Modifying any of the fields above does not cost credits.
        </p>
        {generationError ? (
          <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
            {generationError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {generatedIdeas.map((idea) => (
          <article
            key={idea.label}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_0_24px_rgba(15,23,42,0.35)] sm:p-8"
          >
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300/80">{idea.label}</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white">{idea.title}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">{idea.description}</p>
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Positioning</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">{idea.positioning}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}