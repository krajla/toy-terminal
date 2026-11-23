import { freshPicker } from "./random.ts";

export const FORTUNES = [
  "Something on your desk is close to the edge. Luna has noticed.",
  "The food bowl is half full. Luna says it is empty.",
  "The sardine you want is hiding. The one you need is hiding better.",
  "It works on my machine. Luna sat on the other one.",
  "The cat is not judging you. The cat has finished judging you.",
  "There are two hard things in computer science: cache invalidation, naming things, and getting the cat off the keyboard.",
  "Natural 1 on the Stealth check. Luna heard you open the treat bag.",
  "Don't ship on Friday. Luna wakes you at 03:00 either way.",
  "The spice must flow. The kibble must flow first.",
  "He who controls the sofa controls the universe.",
  "A nap is not a bug. It is a feature that runs sixteen hours a day.",
  "An unknown cat has joined the chat. It is Luna. It was always Luna.",
];

// fortune and catsay share one picker, so neither shows the line that the other just showed.
export const nextFortune = freshPicker(FORTUNES);
