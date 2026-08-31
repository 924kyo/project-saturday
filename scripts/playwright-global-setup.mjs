import { startWebDistServer } from './serve-web-dist.mjs';

export default async function startPlaywrightServer() {
  const runningServer = await startWebDistServer();

  return async () => {
    await runningServer.close();
  };
}
