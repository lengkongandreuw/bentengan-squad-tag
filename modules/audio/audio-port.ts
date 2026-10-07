import { GameplayAudio, type GameplaySound } from './gameplay-audio.ts';

export type { GameplaySound };

// The only audio contract gameplay sees. Production runs the procedural
// engine; tests substitute a mock recording (name, volume) pairs.
export interface AudioPort {
  play(name: GameplaySound, volume?: number): void;
  close(): void;
}

// One runtime per match. Owns unlock wiring so the composition root only
// creates the port and closes it on teardown.
export const createMatchAudio = (): AudioPort & { unlock: () => void } => {
  const engine = new GameplayAudio();
  void engine.unlock();
  window.addEventListener('pointerdown', engine.unlock);
  window.addEventListener('keydown', engine.unlock);
  return {
    play: (name, volume) => engine.play(name, volume),
    close: () => {
      window.removeEventListener('pointerdown', engine.unlock);
      window.removeEventListener('keydown', engine.unlock);
      engine.close();
    },
    unlock: engine.unlock,
  };
};
