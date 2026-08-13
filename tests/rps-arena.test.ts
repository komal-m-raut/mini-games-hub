import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import { makeChallengeRand } from '@/lib/challenge';
import { THROWS, botMove, counterThrow, uniformThrow } from '@/games/rps-arena/bot';
import {
  applyThrowToMatch,
  initMatchProgress,
  judgeThrow,
  matchOutcome,
  scoreMatch,
} from '@/games/rps-arena/constants';
import { getRpsChallengeRounds, makeRpsChallengeRand } from '@/games/rps-arena/challenge';
import { Throw, ThrowRecord } from '@/games/rps-arena/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0-1 generator for tests that don't care about a seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a history of `n` throws where the player always plays `hand` and
 *  the bot's response is drawn from `botMove` itself, difficulty-aware. */
function simulateConstantPlayer(
  hand: Throw,
  difficulty: Difficulty,
  rand: () => number,
  n: number
): ThrowRecord[] {
  const history: ThrowRecord[] = [];
  for (let i = 0; i < n; i++) {
    const bot = botMove(history, difficulty, rand);
    history.push({ player: hand, bot, result: judgeThrow(hand, bot) });
  }
  return history;
}

/** Builds a history where the player strictly alternates rock/scissors. */
function simulateAlternatingPlayer(difficulty: Difficulty, rand: () => number, n: number): ThrowRecord[] {
  const history: ThrowRecord[] = [];
  for (let i = 0; i < n; i++) {
    const hand: Throw = i % 2 === 0 ? 'rock' : 'scissors';
    const bot = botMove(history, difficulty, rand);
    history.push({ player: hand, bot, result: judgeThrow(hand, bot) });
  }
  return history;
}

describe('judgeThrow', () => {
  it('rock beats scissors, paper beats rock, scissors beats paper', () => {
    expect(judgeThrow('rock', 'scissors')).toBe('win');
    expect(judgeThrow('paper', 'rock')).toBe('win');
    expect(judgeThrow('scissors', 'paper')).toBe('win');
  });

  it('loses the mirror cases', () => {
    expect(judgeThrow('scissors', 'rock')).toBe('lose');
    expect(judgeThrow('rock', 'paper')).toBe('lose');
    expect(judgeThrow('paper', 'scissors')).toBe('lose');
  });

  it('ties on identical throws', () => {
    for (const t of THROWS) expect(judgeThrow(t, t)).toBe('tie');
  });
});

describe('counterThrow / uniformThrow', () => {
  it('counters every throw correctly', () => {
    expect(judgeThrow(counterThrow('rock'), 'rock')).toBe('win');
    expect(judgeThrow(counterThrow('paper'), 'paper')).toBe('win');
    expect(judgeThrow(counterThrow('scissors'), 'scissors')).toBe('win');
  });

  it('uniformThrow always returns a legal throw', () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      expect(THROWS).toContain(uniformThrow(rand));
    }
  });
});

describe('botMove — legality', () => {
  it('never sees the current player throw (by construction)', () => {
    // history, difficulty, rand — nothing else. No parameter exists for the
    // throw in progress, so the bot cannot read it even in principle.
    expect(botMove.length).toBe(3);
  });

  it('always returns a legal throw, for every difficulty and a range of history lengths', () => {
    const rand = mulberry32(42);
    for (const difficulty of DIFFICULTIES) {
      let history: ThrowRecord[] = [];
      for (let i = 0; i < 40; i++) {
        const bot = botMove(history, difficulty, rand);
        expect(THROWS).toContain(bot);
        const hands: Throw[] = ['rock', 'paper', 'scissors'];
        const player = hands[i % 3];
        history = [...history, { player, bot, result: judgeThrow(player, bot) }];
      }
    }
  });

  it('is uniform-capable on an empty history for every difficulty', () => {
    const rand = mulberry32(7);
    for (const difficulty of DIFFICULTIES) {
      expect(THROWS).toContain(botMove([], difficulty, rand));
    }
  });
});

describe('botMove — determinism', () => {
  it('produces an identical move sequence from two independently-seeded but identical rand streams, given the same history script', () => {
    const script: Throw[] = ['rock', 'rock', 'paper', 'scissors', 'rock', 'paper', 'scissors', 'scissors'];

    const run = (rand: () => number): Throw[] => {
      const moves: Throw[] = [];
      let history: ThrowRecord[] = [];
      for (const player of script) {
        const bot = botMove(history, 'hard', rand);
        moves.push(bot);
        history = [...history, { player, bot, result: judgeThrow(player, bot) }];
      }
      return moves;
    };

    const movesA = run(makeChallengeRand('same-code', 'rps-arena'));
    const movesB = run(makeChallengeRand('same-code', 'rps-arena'));
    expect(movesA).toEqual(movesB);
  });

  it('a different seed produces a different sequence somewhere in the run', () => {
    // Easy is uniform on every throw, so its output is a direct function of
    // the rand stream's values — the right difficulty to prove two seeds
    // actually diverge (Medium/Hard's counter-picking is mostly seed-
    // independent whenever the noise roll doesn't fire, which would make
    // this comparison flaky).
    const script: Throw[] = ['rock', 'rock', 'rock', 'paper', 'scissors', 'rock', 'paper', 'rock'];
    const run = (rand: () => number): Throw[] => {
      const moves: Throw[] = [];
      let history: ThrowRecord[] = [];
      for (const player of script) {
        const bot = botMove(history, 'easy', rand);
        moves.push(bot);
        history = [...history, { player, bot, result: judgeThrow(player, bot) }];
      }
      return moves;
    };
    const movesA = run(makeChallengeRand('code-one', 'rps-arena'));
    const movesB = run(makeChallengeRand('code-two', 'rps-arena'));
    expect(movesA).not.toEqual(movesB);
  });
});

describe('botMove — medium exploits a rock-spammer', () => {
  it('beats rock significantly more often than uniform chance over 300 throws', () => {
    const rand = mulberry32(1234);
    const history = simulateConstantPlayer('rock', 'medium', rand, 300);
    const wins = history.filter((h) => h.result === 'lose').length; // player loses = bot won the throw
    const winRate = wins / history.length;
    // Uniform chance to beat a fixed rock is exactly 1/3; Medium should
    // clear that by a wide margin (75% counter + 25% noise's own 1/3 share).
    expect(winRate).toBeGreaterThan(0.6);
  });

  it('plays paper against a rock-spammer far more than any other throw', () => {
    const rand = mulberry32(99);
    const history = simulateConstantPlayer('rock', 'medium', rand, 300);
    const counts: Record<Throw, number> = { rock: 0, paper: 0, scissors: 0 };
    for (const h of history) counts[h.bot]++;
    expect(counts.paper).toBeGreaterThan(counts.rock);
    expect(counts.paper).toBeGreaterThan(counts.scissors);
  });
});

describe('botMove — hard exploits an alternating pattern', () => {
  it('wins the throw far better than chance against strict rock/scissors alternation', () => {
    const rand = mulberry32(555);
    const history = simulateAlternatingPlayer('hard', rand, 200);
    const wins = history.filter((h) => h.result === 'lose').length;
    const winRate = wins / history.length;
    expect(winRate).toBeGreaterThan(0.6);
  });

  it('out-exploits easy (uniform) against the same alternating script', () => {
    const hardHistory = simulateAlternatingPlayer('hard', mulberry32(2), 200);
    const easyHistory = simulateAlternatingPlayer('easy', mulberry32(2), 200);
    const winRate = (h: ThrowRecord[]) => h.filter((x) => x.result === 'lose').length / h.length;
    expect(winRate(hardHistory)).toBeGreaterThan(winRate(easyHistory));
  });
});

describe('scoreMatch', () => {
  it('a dominant win (5-0) scores a perfect 10', () => {
    expect(scoreMatch(5, 0, 'won')).toBe(10);
  });

  it('a close win (5-4) scores 6', () => {
    expect(scoreMatch(5, 4, 'won')).toBe(6);
  });

  it('a close loss (4-5) scores 4.8', () => {
    expect(scoreMatch(4, 5, 'lost')).toBe(4.8);
  });

  it('a shutout loss (0-5) scores 0', () => {
    expect(scoreMatch(0, 5, 'lost')).toBe(0);
  });

  it('a drawn match always scores a flat 5', () => {
    expect(scoreMatch(0, 0, 'drawn')).toBe(5);
    expect(scoreMatch(3, 3, 'drawn')).toBe(5);
    expect(scoreMatch(7, 7, 'drawn')).toBe(5);
  });

  it('clamps to [0, 10] for out-of-spec inputs', () => {
    expect(scoreMatch(20, 5, 'lost')).toBe(10);
    expect(scoreMatch(5, 20, 'won')).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    for (const [pw, bw, outcome] of [
      [5, 0, 'won'],
      [5, 1, 'won'],
      [5, 2, 'won'],
      [5, 3, 'won'],
      [5, 4, 'won'],
      [1, 5, 'lost'],
      [2, 5, 'lost'],
      [3, 5, 'lost'],
      [4, 5, 'lost'],
    ] as const) {
      const score = scoreMatch(pw, bw, outcome);
      expect(score).toBeCloseTo(Math.round(score * 100) / 100, 10);
    }
  });
});

describe('match progression — applyThrowToMatch', () => {
  it('a tie only bumps the throw count', () => {
    const start = initMatchProgress();
    const next = applyThrowToMatch(start, 'tie');
    expect(next).toEqual({ playerWins: 0, botWins: 0, games: 0, throws: 1 });
  });

  it('a win bumps playerWins, games and throws', () => {
    const next = applyThrowToMatch(initMatchProgress(), 'win');
    expect(next).toEqual({ playerWins: 1, botWins: 0, games: 1, throws: 1 });
  });

  it('a loss bumps botWins, games and throws', () => {
    const next = applyThrowToMatch(initMatchProgress(), 'lose');
    expect(next).toEqual({ playerWins: 0, botWins: 1, games: 1, throws: 1 });
  });
});

describe('match progression — matchOutcome (tie-replay / cap logic)', () => {
  it('is undecided (null) before either side reaches 5 wins or a cap is hit', () => {
    expect(matchOutcome({ playerWins: 2, botWins: 2, games: 4, throws: 4 })).toBeNull();
    expect(matchOutcome({ playerWins: 0, botWins: 0, games: 0, throws: 10 })).toBeNull();
  });

  it('the player winning 5 games ends the match "won", any time it happens', () => {
    expect(matchOutcome({ playerWins: 5, botWins: 0, games: 5, throws: 5 })).toBe('won');
    expect(matchOutcome({ playerWins: 5, botWins: 4, games: 9, throws: 9 })).toBe('won');
  });

  it('the bot winning 5 games ends the match "lost"', () => {
    expect(matchOutcome({ playerWins: 0, botWins: 5, games: 5, throws: 5 })).toBe('lost');
    expect(matchOutcome({ playerWins: 4, botWins: 5, games: 9, throws: 9 })).toBe('lost');
  });

  it('ties replaying up to the 15-throw cap decide the match by who leads', () => {
    // A tie-heavy match: 3 real games (2-1) padded out with ties to the cap.
    expect(matchOutcome({ playerWins: 2, botWins: 1, games: 3, throws: 15 })).toBe('won');
    expect(matchOutcome({ playerWins: 1, botWins: 2, games: 3, throws: 15 })).toBe('lost');
  });

  it('hitting the throw cap perfectly level draws the match', () => {
    expect(matchOutcome({ playerWins: 3, botWins: 3, games: 6, throws: 15 })).toBe('drawn');
    expect(matchOutcome({ playerWins: 0, botWins: 0, games: 0, throws: 15 })).toBe('drawn');
  });

  it('a full 15-throw tie-replay simulation ends in a draw', () => {
    let progress = initMatchProgress();
    let decided: ReturnType<typeof matchOutcome> = null;
    for (let i = 0; i < 15 && !decided; i++) {
      progress = applyThrowToMatch(progress, 'tie');
      decided = matchOutcome(progress);
    }
    expect(progress.throws).toBe(15);
    expect(progress.playerWins).toBe(0);
    expect(progress.botWins).toBe(0);
    expect(decided).toBe('drawn');
  });

  it('the games cap alone (defensive — unreachable via real play below 5-5) still resolves correctly', () => {
    expect(matchOutcome({ playerWins: 4, botWins: 4, games: 9, throws: 9 })).toBe('drawn');
    expect(matchOutcome({ playerWins: 5, botWins: 3, games: 9, throws: 9 })).toBe('won');
  });
});

describe('challenge seeding', () => {
  it('getRpsChallengeRounds always returns easy, medium, hard in order', () => {
    for (const code of ['abcdef', 'daily-20260813', 'zzzzzz']) {
      const rounds = getRpsChallengeRounds(code);
      expect(rounds.map((r) => r.difficulty)).toEqual(['easy', 'medium', 'hard']);
    }
  });

  it('makeRpsChallengeRand is deterministic for the same code', () => {
    const a = makeRpsChallengeRand('friend-code');
    const b = makeRpsChallengeRand('friend-code');
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('makeRpsChallengeRand differs across codes', () => {
    const a = makeRpsChallengeRand('code-alpha');
    const b = makeRpsChallengeRand('code-beta');
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('is case-insensitive, matching every other game\'s challenge codes', () => {
    const a = makeRpsChallengeRand('ABCDEF');
    const b = makeRpsChallengeRand('abcdef');
    expect(a()).toBe(b());
  });
});
