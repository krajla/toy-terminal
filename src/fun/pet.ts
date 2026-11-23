import { sittingCat } from "./cat-art.ts";

// pet luna escalates: each pet in a row moves one step, and the fourth one bites and starts the count again.

export interface PetStep {
  art: string;
  cls: string;
  what: string;
  verdict: string;
}

export const PET_STEPS: PetStep[] = [
  { art: sittingCat("( ^.^ )"), cls: "amber", what: "Purr. Luna leans into your hand.", verdict: "One pet. She allows it." },
  { art: sittingCat("( -.- )"), cls: "amber", what: "Luna closes her eyes and purrs louder.", verdict: "Two pets. She is generous today." },
  { art: sittingCat("( o.O )", true), cls: "amber", what: "The tail starts to flick.", verdict: "Three pets. That was the last free one." },
  { art: sittingCat("( >.< )", true), cls: "err", what: "Luna bites your hand. Gently. Mostly.", verdict: "Four pets. You knew the rules." },
];

export class PetMood {
  private count = 0;

  next(): PetStep {
    const step = PET_STEPS[this.count];
    if (!step) throw new Error(`no pet step ${this.count}`);
    this.count = (this.count + 1) % PET_STEPS.length;
    return step;
  }
}
