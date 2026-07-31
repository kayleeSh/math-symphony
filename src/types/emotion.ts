/**
 * Named emotions, positioned on Russell's circumplex model (arousal x valence).
 * This is a deterministic heuristic mapping, not a machine-learning classifier —
 * see math/emotion.ts. Kept as its own module so a real model can be swapped in
 * later without touching the translation engine's public interface.
 */
export type Emotion =
  | 'peaceful'
  | 'dreamy'
  | 'happy'
  | 'energetic'
  | 'aggressive'
  | 'melancholic'
  | 'sad'

export interface EmotionState {
  emotion: Emotion
  /** -1 (low energy) to +1 (high energy). */
  arousal: number
  /** -1 (dark/tense) to +1 (bright/pleasant). */
  valence: number
}
