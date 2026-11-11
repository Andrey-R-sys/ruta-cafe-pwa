import fs from 'node:fs/promises';
import path from 'node:path';
export function createStore(directory = process.env.DATA_DIR || path.resolve('data')) {
  let state;
  let tail = Promise.resolve();
  const ready = (async () => {
    await fs.mkdir(directory, { recursive: true });
    try { state = JSON.parse(await fs.readFile(path.join(directory, 'store.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; state = { reviews: [], subscriptions: [] }; }
  })();
  return {
    async read() { await ready; await tail; return structuredClone(state); },
    write(mutate) {
      const operation = tail.then(async () => {
        await ready;
        const next = structuredClone(state);
        const result = mutate(next);
        const temp = path.join(directory, `store-${process.pid}.tmp`);
        await fs.writeFile(temp, JSON.stringify(next), { mode: 0o600 });
        await fs.rename(temp, path.join(directory, 'store.json'));
        state = next;
        return result;
      });
      tail = operation.catch(() => {});
      return operation;
    }
  };
}
