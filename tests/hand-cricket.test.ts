import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import { BallPhase, BallRecord, botBat, botBowl } from '@/games/hand-cricket/bot';
import { MatchResult, getTarget, scoreMatch } from '@/games/hand-cricket/constants';

/** Deterministic 0–1 sequence, so bot tests don't depend on Math.random —
 *  same pattern as tests/math-sprint.test.ts's seededRand. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

// ── botBowl / botBat — legality ──────────────────────────────────────

describe('botBowl / botBat — legality', () => {
  it('always returns an integer 1–6, for every difficulty and role, with growing history', () => {
    for (const difficulty of DIFFICULTIES) {
      const rand = seededRand(difficulty.length * 7 + 1);
      const history: BallRecord[] = [];
      for (let i = 0; i < 500; i++) {
        const phase: BallPhase = i % 2 === 0 ? 'innings1' : 'innings2';

        const bowl = botBowl(history, difficulty, rand);
        expect(Number.isInteger(bowl)).toBe(true);
        expect(bowl).toBeGreaterThanOrEqual(1);
        expect(bowl).toBeLessThanOrEqual(6);

        const bat = botBat(history, difficulty, rand);
        expect(Number.isInteger(bat)).toBe(true);
        expect(bat).toBeGreaterThanOrEqual(1);
        expect(bat).toBeLessThanOrEqual(6);

        history.push({
          playerPick: 1 + Math.floor(rand() * 6),
          botPick: phase === 'innings1' ? bowl : bat,
          phase,
        });
      }
    }
  });
});

// ── botBowl / botBat — determinism ──────────────────────────────────

describe('botBowl / botBat — determinism', () => {
  it('the same seed and the same script produce an identical sequence', () => {
    const runScript = (rand: () => number): number[] => {
      const history: BallRecord[] = [];
      const picks: number[] = [];
      for (let i = 0; i < 50; i++) {
        const phase: BallPhase = i % 3 === 0 ? 'innings2' : 'innings1';
        const pick = phase === 'innings1' ? botBowl(history, 'hard', rand) : botBat(history, 'hard', rand);
        picks.push(pick);
        history.push({ playerPick: ((i * 3) % 6) + 1, botPick: pick, phase });
      }
      return picks;
    };

    expect(runScript(seededRand(42))).toEqual(runScript(seededRand(42)));
  });

  it('different seeds are not all the same', () => {
    const values = new Set(
      Array.from({ length: 30 }, (_, i) => botBowl([], 'hard', seededRand(i + 1)))
    );
    expect(values.size).toBeGreaterThan(1);
  });
});

// ── medium: avoidance rules ─────────────────────────────────────────

describe('botBowl — medium never repeats its own last bowl', () => {
  it('holds across 1000 consecutive innings-1 balls', () => {
    const rand = seededRand(7);
    const history: BallRecord[] = [];
    let lastBowl: number | null = null;
    for (let i = 0; i < 1000; i++) {
      const bowl = botBowl(history, 'medium', rand);
      if (lastBowl !== null) expect(bowl).not.toBe(lastBowl);
      history.push({ playerPick: 1 + Math.floor(rand() * 6), botPick: bowl, phase: 'innings1' });
      lastBowl = bowl;
    }
  });
});

describe("botBat — medium avoids the player's last bowl", () => {
  it('never matches the immediately preceding innings-2 playerPick', () => {
    const rand = seededRand(8);
    const history: BallRecord[] = [];
    let lastPlayerBowl: number | null = null;
    for (let i = 0; i < 1000; i++) {
      const bat = botBat(history, 'medium', rand);
      if (lastPlayerBowl !== null) expect(bat).not.toBe(lastPlayerBowl);
      const playerPick = 1 + Math.floor(rand() * 6);
      history.push({ playerPick, botPick: bat, phase: 'innings2' });
      lastPlayerBowl = playerPick;
    }
  });
});

// ── hard: pattern reading ────────────────────────────────────────────

describe("botBowl — hard bowls what the player has batted most", () => {
  it('targets an "always bats 4" script well above the 1/6 baseline over 300 balls', () => {
    const rand = seededRand(99);
    const history: BallRecord[] = [];
    let fours = 0;
    for (let i = 0; i < 300; i++) {
      const bowl = botBowl(history, 'hard', rand);
      if (bowl === 4) fours++;
      history.push({ playerPick: 4, botPick: bowl, phase: 'innings1' });
    }
    // Asymptotic rate is 0.8·1 + 0.2·(1/6) ≈ 0.833; well above the 1/6 ≈
    // 0.167 baseline a uniform bowler would produce.
    expect(fours / 300).toBeGreaterThan(0.5);
  });
});

describe("botBat — hard avoids the player's two most frequent bowls", () => {
  it('rarely throws the number the player bowls most, once the pattern is established', () => {
    const rand = seededRand(123);
    const history: BallRecord[] = [];
    // Seed a clear, dominant pattern: the player bowls 5 every time.
    for (let i = 0; i < 50; i++) {
      history.push({ playerPick: 5, botPick: 1 + Math.floor(rand() * 6), phase: 'innings2' });
    }
    const trials = 300;
    let fives = 0;
    for (let i = 0; i < trials; i++) {
      if (botBat(history, 'hard', rand) === 5) fives++;
    }
    // Only the 20% uniform-noise slice can ever land on 5 once it's the
    // clear top bowl, so its rate should sit well under the 1/6 baseline.
    expect(fives / trials).toBeLessThan(1 / 6);
  });
});

// ── full-match simulation — chase termination ───────────────────────

interface SimulatedMatch {
  playerRuns: number;
  botRuns: number;
  target: number;
  result: MatchResult;
}

/** Plays a full match — both innings — purely off a shared seeded RNG (used
 *  for both the bot's dice and, as a deterministic stand-in, the "player"'s
 *  throws), applying hand cricket's own rules: one wicket, then a chase of
 *  playerRuns + 1. Throws if either innings runs past `maxBalls`, so a test
 *  failure here means the match genuinely hung rather than the assertion
 *  just being slow. */
function simulateMatch(difficulty: Difficulty, rand: () => number, maxBalls = 5000): SimulatedMatch {
  const history: BallRecord[] = [];

  let playerRuns = 0;
  let innings1Balls = 0;
  let out = false;
  while (!out) {
    innings1Balls++;
    if (innings1Balls > maxBalls) throw new Error('innings 1 never resolved');
    const playerPick = 1 + Math.floor(rand() * 6);
    const botPick = botBowl(history, difficulty, rand);
    history.push({ playerPick, botPick, phase: 'innings1' });
    if (playerPick === botPick) {
      out = true;
    } else {
      playerRuns += playerPick;
    }
  }

  const target = getTarget(playerRuns);
  let botRuns = 0;
  let result: MatchResult | null = null;
  let innings2Balls = 0;
  while (result === null) {
    innings2Balls++;
    if (innings2Balls > maxBalls) throw new Error('innings 2 never resolved');
    const playerPick = 1 + Math.floor(rand() * 6);
    const botPick = botBat(history, difficulty, rand);
    history.push({ playerPick, botPick, phase: 'innings2' });
    if (playerPick === botPick) {
      result = botRuns === playerRuns ? 'tie' : 'win';
    } else {
      botRuns += botPick;
      if (botRuns >= target) result = 'loss';
    }
  }

  return { playerRuns, botRuns, target, result };
}

describe('full match simulation — chase termination', () => {
  it('always resolves (bot out or target reached), for many seeded matches across every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 25; seed++) {
        const outcome = simulateMatch(difficulty, seededRand(seed * 31 + difficulty.length));

        expect(['win', 'tie', 'loss']).toContain(outcome.result);
        expect(outcome.target).toBe(outcome.playerRuns + 1);

        if (outcome.result === 'win') expect(outcome.botRuns).toBeLessThan(outcome.playerRuns);
        if (outcome.result === 'tie') expect(outcome.botRuns).toBe(outcome.playerRuns);
        if (outcome.result === 'loss') expect(outcome.botRuns).toBeGreaterThanOrEqual(outcome.target);
      }
    }
  });
});

// ── getTarget ─────────────────────────────────────────────────────────

describe('getTarget', () => {
  it('is always one more than the player\'s first-innings total', () => {
    expect(getTarget(0)).toBe(1);
    expect(getTarget(17)).toBe(18);
    expect(getTarget(120)).toBe(121);
  });
});

// ── scoreMatch ────────────────────────────────────────────────────────

describe('scoreMatch', () => {
  it('a dominant win clamps at 10', () => {
    expect(scoreMatch('win', 30, 0, 31)).toBe(10);
    expect(scoreMatch('win', 50, 5, 51)).toBe(10);
  });

  it('a win by the smallest possible margin scores ~7.15', () => {
    expect(scoreMatch('win', 10, 10, 11)).toBeCloseTo(7.15, 2);
  });

  it('a tie is always a flat 5, regardless of the runs involved', () => {
    expect(scoreMatch('tie', 3, 3, 4)).toBe(5);
    expect(scoreMatch('tie', 40, 40, 41)).toBe(5);
  });

  it('a near-chase loss caps at 4.9', () => {
    expect(scoreMatch('loss', 50, 51, 51)).toBe(4.9);
    expect(scoreMatch('loss', 99, 100, 100)).toBe(4.9);
  });

  it('a 0-run loss scores 0', () => {
    expect(scoreMatch('loss', 0, 1, 1)).toBe(0);
  });

  it('every result rounds to at most 2 decimal places', () => {
    const cases: Array<[MatchResult, number, number, number]> = [
      ['win', 12, 9, 13],
      ['loss', 7, 8, 8],
      ['loss', 3, 4, 4],
    ];
    for (const [result, playerRuns, botRuns, target] of cases) {
      const score = scoreMatch(result, playerRuns, botRuns, target);
      expect(score).toBe(Math.round(score * 100) / 100);
    }
  });
});
