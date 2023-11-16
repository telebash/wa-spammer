import { Job, Worker } from "bullmq";
import env from "./env";
import { createSession, getSession, jidExists, sessionExists } from "./lib/wa";
import { proto } from "@whiskeysockets/baileys";
import { logger } from "./shared";
import { delay, getRandomArbitrary } from "./utils";

const jobs: Record<string, Function> = {
  'addSession': async (job: Job) => {
    const { sessionId, readIncomingMessages, ...socketConfig } = job.data;
    if (sessionExists(sessionId)) return { error: 'Session already exists' };
    const data: any = await createSession({ sessionId, readIncomingMessages, socketConfig });
    return data
  },
  'startSpamming': async (job: Job) => {
    const { numbers, message, sessionId } = job.data;
    const jids = numbers.map((number: string) => `${number.replace('+', '')}@s.whatsapp.net`)
    const session = getSession(sessionId)!;
    const results: { index: number; result: proto.WebMessageInfo | undefined }[] = [];
    const errors: { index: number; error: string }[] = [];

    for (const [
      index,
      { jid },
    ] of jids) {
      try {
        const exists = await jidExists(session, jid, 'number');
        if (!exists) {
          errors.push({ index, error: 'JID does not exists' });
          continue;
        }

        if (index > 0) await delay(getRandomArbitrary(500, 1000));
        const result = await session.sendMessage(jid, message);
        results.push({ index, result });
      } catch (e) {
        const message = 'An error occured during message send';
        logger.error(e, message);
        errors.push({ index, error: message });
      }
    }

    const status = numbers.length !== 0 && errors.length === numbers.length ? 500 : 200;

    return {
      status,
      results,
      errors
    }
  }
}

const worker = new Worker("wa", async (job) => {
  return await jobs[job.name](job)
}, {
  connection: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
  }
})

export default worker;