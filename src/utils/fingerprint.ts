import { createHash } from 'crypto';
import { Request } from 'express';

export function generateFingerprint(req: Request): string {
  let ip = req.ip || '';
  
  if (ip.includes('::ffff:')) ip = ip.split(':').pop() || '';
  
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor && typeof forwardedFor === 'string') {
    ip = forwardedFor.split(',')[0].trim();
  }

  const userAgent = req.headers['user-agent'] || '';
  return createHash('sha256').update(ip + userAgent).digest('hex');
}
