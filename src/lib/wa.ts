import { DisconnectReason, type ConnectionState, type SocketConfig } from '@whiskeysockets/baileys/lib/Types';
import makeWASocket, { WASocket, proto } from "@whiskeysockets/baileys";
import { logger, prisma } from "../shared";
import { Boom } from '@hapi/boom';
import { toDataURL } from 'qrcode';
import type { Response } from 'express';
import { useSession } from './session';
import { Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys/lib/Utils';

type Session = WASocket & {
  destroy: () => Promise<void>;
};

const sessions = new Map<string, Session>();
const retries = new Map<string, number>();
const SSEQRGenerations = new Map<string, number>();

const RECONNECT_INTERVAL = Number(process.env.RECONNECT_INTERVAL || 0);
const MAX_RECONNECT_RETRIES = Number(process.env.MAX_RECONNECT_RETRIES || 5);
const SSE_MAX_QR_GENERATION = Number(process.env.SSE_MAX_QR_GENERATION || 5);
const SESSION_CONFIG_ID = 'session-config';

export async function init() {
  const sessions = await prisma.session.findMany({
    select: { sessionId: true, data: true },
    where: { id: { startsWith: SESSION_CONFIG_ID } },
  });

  for (const { sessionId, data } of sessions) {
    const { readIncomingMessages, ...socketConfig } = JSON.parse(data);
    createSession({ sessionId, readIncomingMessages, socketConfig });
  }
}

function shouldReconnect(sessionId: string) {
  let attempts = retries.get(sessionId) ?? 0;

  if (attempts < MAX_RECONNECT_RETRIES) {
    attempts += 1;
    retries.set(sessionId, attempts);
    return true;
  }
  return false;
}

type createSessionOptions = {
  sessionId: string;
  res?: Response;
  SSE?: boolean;
  readIncomingMessages?: boolean;
  socketConfig?: SocketConfig;
};

export async function createSession(options: createSessionOptions) {
  // const { sessionId, res, SSE = false, readIncomingMessages = false, socketConfig } = options;
  const { sessionId, readIncomingMessages = false, socketConfig } = options;
  const configID = `${SESSION_CONFIG_ID}-${sessionId}`;
  let connectionState: Partial<ConnectionState> = { connection: 'close' };
  let result;

  const destroy = async (logout = true) => {
    try {
      await Promise.all([
        logout && socket.logout(),
        prisma.session.deleteMany({ where: { sessionId } }),
      ]);
    } catch (e) {
      logger.error(e, 'An error occured during session destroy');
    } finally {
      sessions.delete(sessionId);
    }
  };

  const handleConnectionClose = () => {
    const code = (connectionState.lastDisconnect?.error as Boom)?.output?.statusCode;
    const restartRequired = code === DisconnectReason.restartRequired;
    const doNotReconnect = !shouldReconnect(sessionId);

    if (code === DisconnectReason.loggedOut || doNotReconnect) {
      // if (res) {
        // !SSE && !res.headersSent && res.status(500).json({ error: 'Unable to create session' });
        // res.end();
      // }
      destroy(doNotReconnect);
      result = { status: 500, error: 'Unable to create session' };
    }

    if (!restartRequired) {
      logger.info({ attempts: retries.get(sessionId) ?? 1, sessionId }, 'Reconnecting...');
    }
    setTimeout(() => createSession(options), restartRequired ? 0 : RECONNECT_INTERVAL);
  };

  const handleNormalConnectionUpdate = async () => {
    if (connectionState.qr?.length) {
      // if (res && !res.headersSent) {
      try {
        const qr = await toDataURL(connectionState.qr);
        // res.status(200).json({ qr });
        result = { status: 200, qr };
      } catch (e) {
        logger.error(e, 'An error occured during QR generation');
        // res.status(500).json({ error: 'Unable to generate QR' });
        result = { status: 500, error: 'Unable to generate QR' }
      }
      // }
      // destroy();
    }
  };

  // const handleSSEConnectionUpdate = async () => {
  //   let qr: string | undefined = undefined;
  //   if (connectionState.qr?.length) {
  //     try {
  //       qr = await toDataURL(connectionState.qr);
  //     } catch (e) {
  //       logger.error(e, 'An error occured during QR generation');
  //     }
  //   }

  //   const currentGenerations = SSEQRGenerations.get(sessionId) ?? 0;
  //   if (!res || res.writableEnded || (qr && currentGenerations >= SSE_MAX_QR_GENERATION)) {
  //     res && !res.writableEnded && res.end();
  //     destroy();
  //     return;
  //   }

  //   const data = { ...connectionState, qr };
  //   if (qr) SSEQRGenerations.set(sessionId, currentGenerations + 1);
  //   res.write(`data: ${JSON.stringify(data)}\n\n`);
  // };

  const handleConnectionUpdate = handleNormalConnectionUpdate;
  const { state, saveCreds } = await useSession(sessionId);
  const socket = makeWASocket({
    printQRInTerminal: true,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: true,
    ...socketConfig,
    auth: {
      creds: state.creds,
      // @ts-ignore
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    // @ts-ignore
    logger,
  });

  sessions.set(sessionId, { ...socket, destroy });

  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
    connectionState = update;
    const { connection } = update;

    if (connection === 'open') {
      retries.delete(sessionId);
      SSEQRGenerations.delete(sessionId);
    }
    if (connection === 'close') handleConnectionClose();
    handleConnectionUpdate();
  });

  await prisma.session.upsert({
    create: {
      id: configID,
      sessionId,
      data: JSON.stringify({ readIncomingMessages, ...socketConfig }),
    },
    update: {},
    where: { sessionId_id: { id: configID, sessionId } },
  });
  return result;
}

export function getSessionStatus(session: Session) {
  const state = ['CONNECTING', 'CONNECTED', 'DISCONNECTING', 'DISCONNECTED'];
  let status = state[(session.ws as unknown as WebSocket).readyState];
  status = session.user ? 'AUTHENTICATED' : status;
  return status;
}

export function listSessions() {
  return Array.from(sessions.entries()).map(([id, session]) => ({
    id,
    status: getSessionStatus(session),
  }));
}

export function getSession(sessionId: string) {
  return sessions.get(sessionId);
}

export async function deleteSession(sessionId: string) {
  sessions.get(sessionId)?.destroy();
}

export function sessionExists(sessionId: string) {
  return sessions.has(sessionId);
}

export async function jidExists(
  session: Session,
  jid: string,
  type: 'group' | 'number' = 'number'
) {
  try {
    if (type === 'number') {
      const [result] = await session.onWhatsApp(jid);
      return !!result?.exists;
    }

    const groupMeta = await session.groupMetadata(jid);
    return !!groupMeta.id;
  } catch (e) {
    return Promise.reject(e);
  }
}
