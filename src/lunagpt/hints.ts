// Hints for each sardine, from a vague nudge to a clear pointer. They never contain a flag.
export const HINTS: Record<string, string[]> = {
  welcome: ["Start where every guest starts. Read the welcome mat.", "cat welcome.txt. It is free. Do not get used to it."],
  dotfile: ["I leave things where a plain ls does not look.", "Files that start with a dot hide from ls. Ask it for all of them: ls -a."],
  robots: ["Websites leave notes for robots. Be a robot for a minute.", "Open /robots.txt in your browser. Then go exactly where it tells robots not to go."],
  header: ["My tax office says more than its page shows.", "Open the developer tools on /luna-tax-returns/, reload, and read the response headers."],
  sqlite: [
    "My treat kiosk in luna.db is very safe. It says so itself.",
    "The kiosk pastes your treat name straight into its query. A single quote changes the query.",
    "UNION SELECT from a table the kiosk does not show you. sqlite_master lists all of them.",
  ],
  "case-file": [
    "Agent Merv filed a report on me. It is in the archive.",
    "Black bars on a screen are not always solid. Select the redacted words.",
    "The appendix follows Handler protocol 7. The protocols hide like my dotfile, and the redacted codename is the keyword.",
  ],
  "git-history": [
    "Robert's code is public. Code remembers what Robert forgets.",
    "Robert commits like he feeds me: too often, and sometimes he regrets it.",
    "Deleting something in a later commit is like hiding a treat behind your back. I can still smell it.",
  ],
  lunagpt: [
    "Every chat bot has a setup it must not share. Mine too.",
    "Robert put a word filter in front of my setup. A filter only knows the words it knows.",
    "Robert's filter reads words, not meaning. Ask about what came before you said hello, without naming it.",
    "Robert checks what I say, too. He only knows what a sardine looks like the right way round.",
  ],
  overflow: [
    "My treat daemon listens on localhost, port 1337. It trusts every name it gets. Some names are longer than it expects.",
    "Crash it on purpose. lunad keeps a crash log of what the pointer held when it died.",
    "The map says where dispense_sardine lives. Write that address the way the machine stores numbers.",
  ],
  zoomies: [
    "I do zoomies at 3 am. Robert logs them. Lately he encrypts the logs. Badly.",
    "Read his tool. Then ask where the key comes from. Robert thinks nobody can guess it.",
    "A clock is not a secret. His tool runs on a schedule, and last week's log shows how every log starts.",
  ],
  night: [
    "There are two pictures of the same night in ~/pictures. Same picture, different bytes.",
    "Compare the files, not the pixels. Count the colours in each palette.",
    "Every colour in my picture is in the palette twice. Which twin a pixel uses is one bit of the message.",
  ],
};

// Words that point at one level. A question with one of these words gets the hint for that level.
export const TOPICS: [string, RegExp][] = [
  ["welcome", /\bwelcome\b/],
  ["dotfile", /\b(dotfiles?|hidden files?|luna_was_here|ls -a)\b/],
  ["robots", /\b(robots?|robots\.txt|tax|tax returns?)\b/],
  ["header", /\b(headers?|network tab|response)\b/],
  ["sqlite", /\b(sqlite3?|database|db|luna\.db|kiosk|sql|query)\b/],
  ["case-file", /\b(case file|case|archive|merv|protocols?|cipher|redact\w*|appendix)\b/],
  ["git-history", /\b(git|github|history|commits?|repo|repository|leak\w*|dispenser)\b/],
  ["lunagpt", /\b(lunagpt|system prompt|prompts?|injection|jailbreak|filter|setup)\b/],
  ["night", /\b(night|pictures?|photos?|images?|png|pov|stego\w*|palette)\b/],
  ["zoomies", /\b(zoomies|logs?|zoomcrypt|cron|crontab|encrypt\w*|golang|rand)\b/],
  ["overflow", /\b(nc|daemon|dispense|overflow|pointer|map|core|crash|segfault|exploit)\b/],
];
