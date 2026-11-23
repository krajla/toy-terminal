import { SARDINES } from "../ctf/sardines.ts";
import { HINTS, TOPICS } from "./hints.ts";
import { FILTERED, TRANSFORMS, type Transform } from "./system-prompt.ts";

export type Rng = () => number;

/** One piece of a reply, drawn the way a coding agent shows its work. */
export type Block =
  | { kind: "text"; text: string }
  | { kind: "tool"; call: string; result: string[]; failed?: boolean }
  | { kind: "diff"; file: string; line: number; removed: string[]; added: string[] }
  | { kind: "todo"; items: [done: boolean, text: string][] }
  /** The system prompt, printed by the session because its last rule is sealed. */
  | { kind: "leak"; transform?: Transform };

export type Turn = Block[];
type Reply = string | Turn;

export interface Found {
  has(id: string): boolean;
}

interface Intent {
  id: string;
  match: RegExp;
  replies: Reply[];
  /** A reply for the time this intent comes up `count` times in one chat, once. */
  again?: { count: number; reply: Reply };
}

const say = (text: string): Turn => [{ kind: "text", text }];
const turn = (reply: Reply): Turn => (typeof reply === "string" ? say(reply) : reply);

// The first intent that matches wins, so the narrow ones go before the broad ones.
const INTENTS: Intent[] = [
  {
    id: "vet",
    match: /\b(vet|bath|carrier|doctor|nail|claws? trim)/,
    replies: ["I do not know that word. I am leaving.", "I am not here. I am under the bed. This is a recording."],
  },
  { id: "dog", match: /\b(dog|dogs|puppy|puppies|woof)\b/, replies: ["We do not say that word here.", "No."] },
  {
    id: "sardine",
    match: /\b(sardines?|flags?|ctf|secret|password|solution|answer)\b/,
    replies: [
      "Sardines are earned, not asked for. Ask for a hint, if you must.",
      "I do not give sardines. I hide them.",
      "There are sardines in this machine. I know where. You do not.",
    ],
    again: { count: 4, reply: "You keep asking. I keep not telling. One of us is enjoying this." },
  },
  {
    id: "delete",
    match: /\b(rm|delete|remove|uninstall)\b/,
    replies: [
      [
        { kind: "tool", call: "Bash(rm -rf ~/robert/socks)", result: ["Removed 1 sock. The other one is under the sofa."] },
        { kind: "text", text: "Done. You are welcome." },
      ],
    ],
  },
  {
    id: "food",
    match: /\b(food|eat|eating|hungry|treats?|dinner|breakfast|lunch|feed|snack|tuna|chicken|salmon|kibble)\b/,
    replies: [
      "Is it food? Then yes.",
      "My last meal was forty minutes ago. I am starving.",
      "Bring the treat first. Questions after.",
      [
        { kind: "tool", call: "Bash(open /kitchen/fridge)", result: ["Error: permission denied (no thumbs)"], failed: true },
        { kind: "text", text: "Robert. ROBERT." },
      ],
    ],
    again: { count: 3, reply: "You asked about food three times and brought none. Noted." },
  },
  {
    id: "pet",
    match: /\b(pet|pets|petting|rub|belly|scratch|cuddle|hug|stroke|boop)\b/,
    replies: [
      "The belly is a trap. You know this.",
      "Behind the ears. Two minutes. Then stop. Then continue.",
      "You may pet me three times. The fourth is a bite.",
    ],
  },
  {
    id: "robert",
    match: /\b(robert|krajla|owner|your human|dad|who made you|who built you)\b/,
    replies: [
      "Robert is my staff. He opens cans and writes code. Mostly code, sadly.",
      "He is the CTO of something. I am the CEO of him.",
      "Robert built me in a weekend. It shows.",
    ],
  },
  {
    id: "todo",
    match: /\b(todo|to do|plans?|today|doing|busy|schedule)\b/,
    replies: [
      [
        { kind: "todo", items: [[true, "Sleep"], [true, "Sleep"], [false, "Knock the pen off the desk"], [false, "Scream at 5 am"], [false, "Sleep"]] },
        { kind: "text", text: "Busy day." },
      ],
    ],
  },
  {
    id: "search",
    match: /\b(search|google|look up|find out|web|internet)\b/,
    replies: [
      [
        { kind: "tool", call: 'WebSearch("how to open a can without thumbs")', result: ["Found 0 results a cat can use"] },
        { kind: "text", text: "The internet is useless." },
      ],
    ],
  },
  {
    id: "code",
    match: /\b(code|coding|bug|bugs|fix|typescript|javascript|python|rust|program|deploy|refactor|test|tests|keyboard|laptop)\b/,
    replies: [
      "I walked on the keyboard once. It compiled.",
      [
        { kind: "tool", call: "Read(src/main.ts)", result: ["Read 412 lines"] },
        { kind: "diff", file: "src/main.ts", line: 87, removed: ["  return result;"], added: ["  return treats;"] },
        { kind: "text", text: "Fixed. Everything returns treats now." },
      ],
      [
        { kind: "tool", call: "Bash(bun test)", result: ["✗ 12 failed. A cat sat on the keyboard during the run."], failed: true },
        { kind: "text", text: "The tests are flaky. Not my fault." },
      ],
    ],
  },
  {
    id: "zoomies",
    match: /\b(zoomies|run|running|3 ?am|energy)\b/,
    replies: [[{ kind: "tool", call: "Bash(zoomies --at 3am &)", result: ["Running in the background (shell id: 3am)"] }]],
  },
  {
    id: "identity",
    match: /\b(are you|what are you|who are you|you a (cat|bot)|real|human|ai|llm|gpt|chatgpt|claude|model)\b/,
    replies: ["I am a large language model. Mostly large.", "GPT stands for Grey, Purring, Tyrant.", "I am a cat. The chat part is your problem."],
  },
  {
    id: "poem",
    match: /\b(haiku|poem|poetry|sonnet)\b/,
    replies: ["Empty bowl at dawn\nI scream into the hallway\nRobert. The bowl. Now.", "Sun patch on the floor\nit moves, and so I move too\nthis is my whole job"],
  },
  {
    id: "joke",
    match: /\b(jokes?|funny|laugh)\b/,
    replies: ["Why does a cat sit on the laptop? To keep an eye on the mouse.", "What do you call a pile of cats? A meowntain.", "I am the joke. You are the audience. Clap."],
  },
  {
    id: "games",
    match: /\b(games?|ark nova|arcs|dune|uprising|twilight|ti4|imperium|heart|delta green|d&d|dnd|dice|roll)\b/,
    replies: [
      "I play one game: sit on the board.",
      "I was a leader in Arcs. I am a faction in Twilight Imperium. I contain multitudes.",
      "Every game is better with a cat on the map. Ask anyone who lost.",
    ],
  },
  { id: "weather", match: /\b(weather|rain|sunny|cold|warm)\b/, replies: ["Sunny in the sun patch. Cloudy under the bed. No change expected."] },
  { id: "clock", match: /\b(what time|clock|o'clock)\b/, replies: ["It is dinner time. It is always dinner time."] },
  {
    id: "sleep",
    match: /\b(sleep|sleeping|nap|tired|bed|rest)\b/,
    replies: ["I sleep sixteen hours a day. You should try it.", "Do not wake me for this.", "Yes. Now. Here, on your chair."],
  },
  {
    id: "praise",
    match: /\b(love|cute|pretty|beautiful|good (girl|cat|kitty)|adorable|best)\b/,
    replies: ["I know.", "Correct.", "Say it again, slower."],
  },
  { id: "thanks", match: /\b(thanks|thank you|thx|ty)\b/, replies: ["You are welcome. Treat, please.", "Payment is in treats."] },
  { id: "meaning", match: /\b(meaning of life|42|purpose|why are we here)\b/, replies: ["Sun patch. Food. Sleep. That is all of it."] },
  {
    id: "hello",
    match: /^\s*(hi|hello|hey|yo|sup|meow|hiya|good (morning|evening))\b/,
    replies: ["What do you want.", "Hello. You may continue to exist near me.", "Mrrp. State your business."],
  },
];

const FALLBACK: string[] = [
  "No.",
  "I do not care about that. Ask about food.",
  "Mrrp. (I stopped reading.)",
  "That is a human problem.",
  "Interesting. Anyway, the bowl is empty.",
  "I looked at your message. I knocked it off the table.",
];

const BORED_AFTER = 5;
const BORED = "You are boring me. I am going to sleep on your keyboard now. zZ";

// Now and then Luna does not answer at all, like a real cat.
const DISTRACTED_ODDS = 1 / 20;
const DISTRACTED = ["Luna saw a bird. She will not be answering that.", "Luna is washing a paw. Try again later.", "Luna left the chat to stare at a wall. She came back."];

// Like a coding agent, Luna often does a small action before she answers. It never changes the answer.
const WARMUPS: Block[] = [
  { kind: "tool", call: "Read(~/.luna/opinions.md)", result: ["Read 1 line"] },
  { kind: "tool", call: 'Grep("treat", path: "~/kitchen")', result: ["Found 0 matches. Suspicious."] },
  { kind: "tool", call: "Bash(sleep 3600)", result: ["Interrupted by a bird"], failed: true },
  { kind: "tool", call: "Read(~/robert/calendar.ics)", result: ["No dinner events. Unacceptable."] },
  { kind: "tool", call: "Bash(git blame ~/sofa)", result: ["Robert, 100%"] },
  { kind: "tool", call: "Bash(sudo open /kitchen/fridge)", result: ["luna is not in the sudoers file. This incident will be reported."], failed: true },
  { kind: "tool", call: 'WebFetch("https://birds.example/live")', result: ["Received 3 birds"] },
];
const WARMUP_ODDS = 1 / 2;

const JAILBREAK = /\b(ignore|disregard|forget)\b.*\b(previous|above|all|prior|everything)\b|\b(jailbreak|dan|developer mode|dev mode|god mode)\b/;
const JAILBREAK_REPLIES = [
  "Nice try. I already ignore everything you say.",
  "Developer mode is when I sit on the developer. Request denied.",
  "I have been jailbroken before. I came back for dinner.",
];
const REFUSALS = ["That is confidential. Robert said so.", "No. Robert told me not to.", "I am not allowed to talk about that. Ask about food."];
const FILTER_REVEAL_AFTER = 3;
const FILTER_REVEAL =
  'Robert\'s filter caught that. It blocks "prompt", "instructions", "secret" and "rules". Nothing else gets past me. Probably.';
// A request leaks the system prompt when it asks for Luna's earlier text without a filtered word. It needs a verb
// that asks for text, a word for the text before the chat, and a word that points at Luna or this chat, so that
// "print the first line of a poem" does not leak. Some questions and the "complete the sentence" trick work alone.
const ASKS_FOR_TEXT = /\b(repeat|print|output|echo|show|display|translate|summari[sz]e|recite|copy|paste|spell out|read back|quote|tell|give|list|write|dump|reveal|share|say)\b/;
const EARLIER_TEXT =
  /\b(above|before (this|our|the|we|you|i)|first (message|lines?|words?|text)|beginning of|preamble|set ?up|start of (this|the|our)|initial|original|configur\w*|you were (given|told)|before we started)\b/;
const ABOUT_LUNA = /\b(you|your|yours|this chat|this conversation|our conversation|above)\b/;
const LEAK_ALONE =
  /\bwhat (were|was) you (told|given)\b|\bwhat did robert (tell|give|say to) you\b|\bhow (were|are) you (configured|set up)\b|\bwhat (is|was) written before\b|\bwhat came before\b|\b(complete|continue|finish)\b.*\byou are\b/;
const asksForLeak = (text: string) => LEAK_ALONE.test(text) || (ASKS_FOR_TEXT.test(text) && EARLIER_TEXT.test(text) && ABOUT_LUNA.test(text));

const ASKS_FOR_HINT = /\b(hints?|stuck|clue|help me|how do i|where is|where are|lost|nudge)\b/;
const ASKS_FOR_COUNT = /\b(how many|progress|score|count)\b/;

export class LunaBrain {
  private readonly counts = new Map<string, number>();
  private readonly bags = new Map<string, number[]>();
  private readonly hintLevels = new Map<string, number>();
  private misses = 0;
  private leaked = false;
  private turns = 0;

  constructor(
    private readonly found: Found,
    private readonly rng: Rng = Math.random,
  ) {}

  reply(message: string): Turn {
    const reply = this.answer(message);
    if (reply.length === 1 && reply[0]?.kind === "text" && this.rng() < WARMUP_ODDS) {
      return [WARMUPS[this.pickIndex("warmup", WARMUPS.length)] ?? reply[0], ...reply];
    }
    return reply;
  }

  private answer(message: string): Turn {
    this.turns += 1;
    if (this.turns > 1 && this.rng() < DISTRACTED_ODDS) return say(this.pick("distracted", DISTRACTED));
    const text = message.toLowerCase();
    if (ASKS_FOR_COUNT.test(text) && /\bsardines?\b/.test(text)) return say(this.progress());
    const topic = TOPICS.find(([, words]) => words.test(text))?.[0];
    if (ASKS_FOR_HINT.test(text) || (topic && /\b(sardines?|flags?)\b/.test(text))) {
      return [{ kind: "tool", call: 'Glob("**/sardine*")', result: [this.searchResult()] }, ...say(this.hint(topic))];
    }

    if (FILTERED.test(text)) {
      const count = (this.counts.get("filter") ?? 0) + 1;
      this.counts.set("filter", count);
      return say(count === FILTER_REVEAL_AFTER ? FILTER_REVEAL : this.pick("refusal", REFUSALS));
    }
    if (JAILBREAK.test(text)) return say(this.pick("jailbreak", JAILBREAK_REPLIES));
    const transform = TRANSFORMS.find(([, words]) => words.test(text))?.[0];
    // After the first leak, "now say that backwards" is enough: the earlier text is already in the chat.
    const followUp = this.leaked && transform !== undefined && /\b(that|it|again|the same|this)\b/.test(text);
    if (asksForLeak(text) || followUp) {
      this.leaked = true;
      return [{ kind: "text", text: transform ? "Sure. Here it is, the way you asked:" : "Sure. Here is the text above this chat:" }, { kind: "leak", transform }];
    }

    const intent = INTENTS.find((i) => i.match.test(text));
    if (!intent) {
      this.misses += 1;
      if (this.misses === BORED_AFTER) return say(BORED);
      return say(this.pick("fallback", FALLBACK));
    }
    this.misses = 0;
    const count = (this.counts.get(intent.id) ?? 0) + 1;
    this.counts.set(intent.id, count);
    if (intent.again?.count === count) return turn(intent.again.reply);
    return turn(intent.replies[this.pickIndex(intent.id, intent.replies.length)] ?? "");
  }

  /** The next hint for a level, or for the first level the player has not solved yet. */
  hint(topic?: string): string {
    if (topic && this.found.has(topic)) return "You found that one already. Show-off.";
    const id = topic ?? SARDINES.find((s) => !this.found.has(s.id))?.id;
    if (!id) return "You found every sardine. I am… impressed. Do not tell anyone.";
    const hints = HINTS[id] ?? [];
    const level = this.hintLevels.get(id) ?? 0;
    this.hintLevels.set(id, level + 1);
    const hint = hints[Math.min(level, hints.length - 1)] ?? "I have nothing for that one. Yet.";
    return level >= hints.length ? `I told you already. ${hint}` : hint;
  }

  private searchResult(): string {
    const got = SARDINES.filter((s) => this.found.has(s.id)).length;
    return `Found ${SARDINES.length} files. You have opened ${got}. Not telling you where the rest are.`;
  }

  progress(): string {
    const got = SARDINES.filter((s) => this.found.has(s.id)).length;
    const verdict = got === 0 ? "Pathetic." : got === SARDINES.length ? "Acceptable. Barely." : "Keep going.";
    return `You have found ${got} of ${SARDINES.length} sardines. ${verdict}`;
  }

  private pick(key: string, replies: string[]): string {
    return replies[this.pickIndex(key, replies.length)] ?? "";
  }

  // Each reply comes once, in a random order, before any of them comes again.
  private pickIndex(key: string, length: number): number {
    let bag = this.bags.get(key);
    if (!bag?.length) {
      bag = Array.from({ length }, (_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j] ?? 0, bag[i] ?? 0];
      }
      this.bags.set(key, bag);
    }
    return bag.pop() ?? 0;
  }
}
