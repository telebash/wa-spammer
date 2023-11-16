import type { proto, WAGenericMediaMessage, WAMessage } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { RequestHandler } from 'express';
import { logger, prisma } from '../shared';
import { delay as delayMs, serializePrisma } from '../utils';
import { getSession, jidExists } from '../lib/wa';

export const send: RequestHandler = async (req, res) => {
  try {
    const { jid, type = 'number', message, options } = req.body;
    const session = getSession(req.params.sessionId)!;

    const exists = await jidExists(session, jid, type);
    if (!exists) return res.status(400).json({ error: 'JID does not exists' });

    const result = await session.sendMessage(jid, message, options);
    res.status(200).json(result);
  } catch (e) {
    const message = 'An error occured during message send';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const sendBulk: RequestHandler = async (req, res) => {
  const session = getSession(req.params.sessionId)!;
  const results: { index: number; result: proto.WebMessageInfo | undefined }[] = [];
  const errors: { index: number; error: string }[] = [];

  for (const [
    index,
    { jid, type = 'number', delay = 1000, message, options },
  ] of req.body.entries()) {
    try {
      const exists = await jidExists(session, jid, type);
      if (!exists) {
        errors.push({ index, error: 'JID does not exists' });
        continue;
      }

      if (index > 0) await delayMs(delay);
      const result = await session.sendMessage(jid, message, options);
      results.push({ index, result });
    } catch (e) {
      const message = 'An error occured during message send';
      logger.error(e, message);
      errors.push({ index, error: message });
    }
  }

  res
    .status(req.body.length !== 0 && errors.length === req.body.length ? 500 : 200)
    .json({ results, errors });
};

export const download: RequestHandler = async (req, res) => {
  try {
    const session = getSession(req.params.sessionId)!;
    const message = req.body as WAMessage;
    const type = Object.keys(message.message!)[0] as keyof proto.IMessage;
    const content = message.message![type] as WAGenericMediaMessage;
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      // @ts-ignore
      { logger, reuploadRequest: session.updateMediaMessage }
    );

    res.setHeader('Content-Type', content.mimetype!);
    res.write(buffer);
    res.end();
  } catch (e) {
    const message = 'An error occured during message media download';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};
