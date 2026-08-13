import { Difficulty, Rating } from '@/types/game';

export type EchoPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'listening'
  | 'matching'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/** How the player's guess sat relative to the target: 'sharp' = too high,
 *  'flat' = too low, matching the musical terms for an off pitch. */
export type PitchDirection = 'sharp' | 'flat' | 'perfect';

export interface EchoResult {
  /** Hz the player had to recreate. */
  target: number;
  /** Hz the player locked in. */
  guess: number;
  /** Absolute pitch distance between guess and target, in cents. */
  cents: number;
  direction: PitchDirection;
  accuracy: number;
  rating: Rating;
  /** Round score out of 10. */
  score: number;
}

export interface EchoGameState {
  phase: EchoPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** Target pitch for the round, Hz. */
  target: number;
  /** The player's live slider pitch, Hz. */
  guess: number;
  /** Replays remaining beyond the first free listen. */
  replaysLeft: number;
  /** Whether the target has been played at least once this round. */
  hasListened: boolean;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: EchoResult | null;
  isNewBestSession: boolean;
  /** True once the AudioContext has failed to start at all — distinct from
   *  muted, which is a deliberate silence the player controls. */
  audioBlocked: boolean;
}
