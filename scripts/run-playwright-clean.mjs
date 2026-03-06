import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const env = { ...process.env };

delete env.FORCE_COLOR;
delete env.NO_COLOR;

const child = spawn('./node_modules/.bin/playwright', args, {
  stdio: 'inherit',
  env,
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
