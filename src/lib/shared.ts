import type { PrismaClient } from '@prisma/client';
import type { SocketConfig } from '@adiwajshing/baileys/lib/Types';
import { DEFAULT_CONNECTION_CONFIG } from '@adiwajshing/baileys/lib/Defaults';
import invariant from 'tiny-invariant';

let prisma: PrismaClient | null = null;
let logger: SocketConfig['logger'] | null = null;

export function setPrisma(prismaClient: PrismaClient) {
  prisma = prismaClient;
}

export function setLogger(pinoLogger?: SocketConfig['logger']) {
  logger = pinoLogger || DEFAULT_CONNECTION_CONFIG.logger;
}

export function usePrisma() {
  invariant(prisma, 'Prisma client cannot be used before initialization');
  return prisma;
}

export function useLogger() {
  invariant(logger, 'Pino logger cannot be used before initialization');
  return logger;
}