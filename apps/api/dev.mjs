import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import { buildOptions } from './build-options.mjs';

let child;
let stopping = false;
async function stopChild() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const running = child;
  await new Promise(resolve => {
    const deadline = setTimeout(() => running.kill('SIGKILL'), 10_000).unref();
    running.once('exit', () => { clearTimeout(deadline); resolve(); });
    running.kill('SIGTERM');
  });
}
const watcher = await context({
  ...buildOptions,
  plugins: [{ name: 'restart-api', setup(build) {
    build.onEnd(async result => {
      if (stopping || result.errors.length) return;
      await stopChild();
      if (!stopping) child = spawn(process.execPath, [buildOptions.outfile], { stdio: 'inherit' });
    });
  } }],
});
await watcher.watch();
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await watcher.dispose();
  await stopChild();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
