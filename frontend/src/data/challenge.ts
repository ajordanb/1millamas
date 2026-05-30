/**
 * Una Milla Más — single source of truth for challenge copy & config.
 * Edit this file to tweak dates, goals, rules, and the GoFundMe link.
 */

export const challenge = {
  name: 'Una Milla Más',
  kicker: 'Run / Bike Challenge',
  tagline: ['The pain is shared.', 'The choice is earned.'],
  subTagline: 'Winner picks the cause',
  dates: 'Jun 15 — Dec 31',
  year: 2026,

  // The fundraiser. We ask for a screenshot of a donation here.
  gofundmeUrl: import.meta.env.VITE_GOFUNDME_URL ?? '',
  // Minimum GoFundMe donation required to enter.
  minDonation: '$25',

  // Distance is tracked via Challenge Hound challenges (one per discipline).
  challenge: {
    run: import.meta.env.VITE_CHALLENGE_RUN_URL ?? '',
    bike: import.meta.env.VITE_CHALLENGE_BIKE_URL ?? '',
    // Access code revealed after registration to join the Challenge Hound challenge.
    joinCode: import.meta.env.VITE_CHALLENGE_JOIN_CODE || '1millamas',
  },

  // Challenge Hound charges a small sign-up fee to cover the app — no profit is made.
  challengeFee: '$2.99 + tax',
  feeNote:
    'Challenge Hound charges a $2.99 + tax sign-up fee to cover the app — we keep none of it and make no profit. Your charity donation is separate, via GoFundMe.',

  // Strava club — community & questions only (not used for tracking).
  stravaClubUrl: import.meta.env.VITE_STRAVA_CLUB_URL ?? '',

  goals: {
    run: { km: 800, miles: 500, label: 'Runners' },
    bike: { km: 3200, miles: 2000, label: 'Cyclists' },
  },

  prize:
    'The first person to reach their goal gets to choose which charity receives the entire donation pot.',
} as const

export type DisciplineKey = keyof typeof challenge.goals

/** Rules drafted from the poster — edit freely. */
export const rules: { heading: string; body: string }[] = [
  {
    heading: 'The challenge',
    body: `From ${challenge.dates}, ${challenge.year}, every participant chases one distance goal. Runners aim for ${challenge.goals.run.km} km (~${challenge.goals.run.miles} miles). Cyclists aim for ${challenge.goals.bike.km} km (~${challenge.goals.bike.miles} miles). Pick the discipline that fits how you move.`,
  },
  {
    heading: 'How to enter',
    body: 'This is a fundraiser, so entry has two parts. First, make a donation of at least $25 on our GoFundMe page and upload a screenshot here — create an account, choose run or bike, and attach your proof. Then join the challenge on Challenge Hound, which charges a $2.99 + tax sign-up fee to cover the app. We keep none of that fee and make no profit on it; every cent of fundraising goes through GoFundMe to the chosen charity.',
  },
  {
    heading: 'Logging distance',
    body: 'No manual logging here. After you register, we reveal a join code and link for the challenge that matches your discipline (one for runners, one for cyclists), where you connect your Strava. From then on, every activity you record on Strava counts automatically toward your goal and the leaderboard. Join our Strava club too — that\'s where we hang out, share updates, and answer questions.',
  },
  {
    heading: 'The prize',
    body: `${challenge.prize} No categories. No complicated rules — whoever crosses their goal line first decides where the money goes.`,
  },
  {
    heading: 'Spirit of the thing',
    body: 'Be honest with your mileage, cheer each other on, and stay safe out there. The pain is shared; the choice is earned.',
  },
]
