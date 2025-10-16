import { createHash } from 'crypto';
import { Request } from 'express';

export function generateFingerprint(req: Request): string {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  return createHash('sha256').update(ip + userAgent).digest('hex');
}
