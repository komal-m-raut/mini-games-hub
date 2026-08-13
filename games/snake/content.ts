import { GameContent } from '@/types/content';

/**
 * Real content for the Snake game page — written against
 * `games/snake/constants.ts` (`SNAKE_DIFFICULTY`, `tickMs`, `scoreRound`)
 * and `games/snake/engine.ts`, so every number below is true of the actual
 * game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Snake has barely changed since it first shipped on monochrome phone screens in the late 1990s, and that's the point: steer a line that only ever gets longer, eat to grow, and never let your own tail — or a wall — cross your path. There's no combo system, no power-ups, nothing to read; the entire game is one continuously tightening spatial puzzle, and it endures because that puzzle never stops being interesting. Every bite makes the board a little more crowded and the snake a little faster, so the skill you're actually building is pure forward planning under acceleration: leaving yourself an exit before you need it, not after.",
    "This build runs on a 17×15 grid. Speed is tied directly to how much you've eaten: on Easy the tick interval starts at 140ms and eases down to a 95ms floor, losing 1.5ms per food eaten; Medium starts at 120ms and eases to an 80ms floor at 1.6ms per food; Hard starts at 105ms and eases to a 65ms floor, also at 1.6ms per food. None of the three ever gets faster than its floor, however long the run goes — the ceiling on how brutal a run can get is fixed, even if the ceiling on how long you can survive it isn't.",
    'Solo is endless: pick a difficulty and keep eating until you hit a wall or yourself, with your personal best (in food eaten) kept per difficulty on this device. Daily and Friend Challenges are different: three fixed 60-second sprints, one each at Easy, Medium and Hard speed, with the exact same food sequence for every player on a given code — so a challenge run rewards controlled, fast eating over a short, sharp window rather than a long survival grind.',
  ],
  tips: [
    'Hug the walls early, while the board is nearly empty and the tail is short — the edges are the safest place to eat food without accidentally trapping yourself later, when there is far less free space to recover from a mistake.',
    "Spiral inward deliberately instead of chasing food in whatever direction it happens to appear — a controlled spiral always leaves you an exit corridor, where reacting to food position alone tends to wall you in against your own tail.",
    'Always know your way out before you commit to a turn. The moment you can no longer picture a path from your head back to open space, you are already in danger, even if the next few moves look fine on screen.',
    "Remember the tail-vacate rule: moving into the cell your tail currently occupies is legal, because the tail moves out of the way the same tick your head arrives — unless you're about to grow that tick, in which case the tail stays put and that same move is fatal. Knowing which situation you're in is often the difference between a clean escape and a wall.",
    'In a Daily or Friend Challenge sprint, prioritise the nearest food over a slightly bigger detour — banking a few extra bites beats a greedy run that risks dying with time still on the clock, since a round that ends early only scores whatever was banked at that moment.',
    'Use the 2-deep direction queue on purpose for fast S-turns: queuing two quick turns (say, down then left) lands both in sequence, one per tick, which reads far more reliably under pressure than trying to time two separate key presses exactly on tick boundaries.',
  ],
  faq: [
    {
      q: 'How is the challenge round scored?',
      a: 'Each of the 3 rounds (Easy, Medium, Hard, 60 seconds each) scores out of 10 as your food eaten divided by 2.5, capped at 10 — so 25 food inside the 60 seconds is a perfect 10. That is a steep curve on purpose: it takes a genuinely excellent round, not just a competent one, to max out a single round, and the three rounds combine for up to 30 points total.',
    },
    {
      q: 'What happens if I die partway through a challenge round?',
      a: "Whatever food you ate before dying is banked and scored immediately — the round ends right there rather than forcing a restart, so an early death still counts for something. Surviving the full 60 seconds also ends the round, scored the same way off however much food you managed to eat in that time.",
    },
    {
      q: 'Can I really move into the cell my own tail is on?',
      a: "Yes, and it's the standard rule, not a bug: your tail vacates its cell the same tick your head moves into it, so that move is legal — unless you're about to grow on that same tick (just eaten food last turn), in which case the tail stays put and moving into it is fatal, exactly like hitting any other part of your own body.",
    },
    {
      q: 'What if I switch tabs or lock my phone mid-run?',
      a: "The run freezes the instant the tab goes hidden — the snake stops moving and, in a challenge round, the clock stops too — and it never resumes on its own; you have to tap the board or press any key when you come back. In solo, the paused board stays dimly visible so you can look and plan; in a challenge round the board is hidden behind the pause overlay while frozen, so pausing can't be used to get a longer look at a food sequence you're meant to be reacting to in real time.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is the same three seeded 60-second rounds (Easy, Medium, Hard) for every player, generated from a code that changes at midnight UTC — so the whole world eats the identical food sequence, in the identical order, until the next day's code takes over.",
    },
    {
      q: 'Is Snake free, and do I need an account?',
      a: 'Completely free, with no download or signup. Your solo bests are stored per difficulty on this device, and an anonymous device ID lets your challenge scores and leaderboard entries carry across visits without collecting anything personal.',
    },
  ],
  related: ['2048', 'tap-frenzy', 'minesweeper', 'timing-tap'],
};
