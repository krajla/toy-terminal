export const MEAL_HOURS = [9, 15, 21];

const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

export function isMealTime(now: Date): boolean {
  return MEAL_HOURS.includes(now.getHours());
}

export function nextMeal(now: Date): string {
  const hour = MEAL_HOURS.find((h) => h > now.getHours()) ?? MEAL_HOURS[0] ?? 9;
  return hhmm(hour, 0);
}

export function feed(now: Date): string[] {
  const time = hhmm(now.getHours(), now.getMinutes());
  if (isMealTime(now)) {
    return [`It is ${time}. Dinner is served.`, "Luna eats. Om nom nom. She looks at you with something close to respect."];
  }
  return [
    `It is ${time}. Luna eats at 09:00, 15:00 and 21:00. Not one minute more often.`,
    `She stares at the bowl, then at you. Come back at ${nextMeal(now)}.`,
  ];
}
