import bcrypt from 'bcryptjs';

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function hashCode(code: string) {
  return bcrypt.hash(code, 12);
}

export function compareCode(code: string, hash?: string | null) {
  if (!hash) return false;
  return bcrypt.compare(code, hash);
}
