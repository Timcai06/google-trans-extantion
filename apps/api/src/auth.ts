import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { Storage } from './database';
import { ApiError } from './errors';

export type User = { id: string; email: string };
type UserRow = User & { salt: string; password_hash: string };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const derive = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });

export function credentials(input: unknown): { email: string; password: string } {
  if (!input || typeof input !== 'object')
    throw new ApiError(400, 'INVALID_INPUT', 'Expected email and password.');
  const { email, password } = input as Record<string, unknown>;
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new ApiError(400, 'INVALID_INPUT', 'Enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
    throw new ApiError(400, 'INVALID_INPUT', 'Password must contain 8 to 256 characters.');
  }
  return { email: email.trim().toLowerCase(), password };
}

export class Auth {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number,
    private readonly ttl: number,
  ) {}

  async register(input: unknown) {
    const { email, password } = credentials(input);
    const salt = randomBytes(32).toString('hex');
    const hash = await derive(password, salt);
    const user = { id: randomUUID(), email };
    try {
      this.storage.db
        .prepare(
          'INSERT INTO users(id, email, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(user.id, email, salt, hash.toString('hex'), this.now());
    } catch (error) {
      if (
        (error as { code?: string }).code?.includes('SQLITE') &&
        this.storage.db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      ) {
        throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
      }
      throw error;
    }
    return this.session(user);
  }

  async login(input: unknown) {
    const { email, password } = credentials(input);
    const row = this.storage.db
      .prepare('SELECT id, email, salt, password_hash FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
    const candidate = await derive(password, row?.salt ?? '00000000000000000000000000000000');
    const expected = row ? Buffer.from(row.password_hash, 'hex') : Buffer.alloc(64);
    if (!timingSafeEqual(candidate, expected) || !row)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    return this.session({ id: row.id, email: row.email });
  }

  authenticate(header: string | undefined): User {
    if (!header || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header))
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
    const row = this.storage.db
      .prepare(
        'SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?',
      )
      .get(digest(header.slice(7)), this.now()) as User | undefined;
    if (!row) throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or revoked. Sign in again.');
    return { id: row.id, email: row.email };
  }

  logout(header: string) {
    this.storage.db
      .prepare('DELETE FROM sessions WHERE token_hash = ?')
      .run(digest(header.slice(7)));
  }

  private session(user: User) {
    const token = randomBytes(32).toString('base64url');
    this.storage.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(this.now());
    this.storage.db
      .prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(digest(token), user.id, this.now() + this.ttl);
    return { token, user };
  }
}
