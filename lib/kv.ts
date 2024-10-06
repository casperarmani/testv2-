import { kv } from '@vercel/kv';

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set in .env.local');
}

export async function getConversationHistory(userId: string): Promise<string[]> {
  return await kv.lrange(`user:${userId}:history`, 0, -1);
}

export async function addToConversationHistory(userId: string, message: string): Promise<void> {
  await kv.rpush(`user:${userId}:history`, message);
  await kv.ltrim(`user:${userId}:history`, -50, -1);
}

export async function clearConversationHistory(userId: string): Promise<void> {
  await kv.del(`user:${userId}:history`);
}