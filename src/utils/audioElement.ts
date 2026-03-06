export function createManagedAudio(src?: string): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = 'metadata';

  if (src) {
    audio.src = src;
  }

  return audio;
}
