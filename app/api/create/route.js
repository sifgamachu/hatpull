import { serverRpc, verifiedCreator } from '@/lib/serverDb';
import { createCelebrationHandler } from '@/lib/organizer-handlers.mjs';
export const POST = createCelebrationHandler({ verify: verifiedCreator, rpc: serverRpc });
