import { afterEach, beforeEach, vi } from 'vitest';

type ConsoleMethod = 'error' | 'warn' | 'log';

export function muteConsole(methods: ConsoleMethod[] = ['warn', 'error']): void {
  let spies: Array<{ mockRestore: () => void }> = [];

  beforeEach(() => {
    spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
  });

  afterEach(() => {
    for (const spy of spies) {
      spy.mockRestore();
    }
    spies = [];
  });
}
