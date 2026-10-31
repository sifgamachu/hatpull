import { serverRpc, verifiedCreator } from '@/lib/serverDb';
import { createRedrawHandler } from '@/lib/organizer-handlers.mjs';
export const POST = createRedrawHandler({ verify: verifiedCreator, rpc: serverRpc });
