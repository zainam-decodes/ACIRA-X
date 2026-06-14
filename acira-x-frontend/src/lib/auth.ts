/**
 * ACIRA-X Authentication Utilities
 *
 * NOTE: This is a Proof-of-Concept / Academic MVP implementation.
 * Production deployments MUST replace this with:
 *   - Hashed passwords (bcrypt/argon2) stored in a secure database
 *   - Server-side session management (JWT with RS256, or HttpOnly cookies)
 *   - Role-Based Access Control (RBAC) with fine-grained permissions
 *   - Multi-Factor Authentication (MFA / TOTP)
 *   - Rate limiting and account lockout policies
 *   - Audit logging for all auth events
 */

const SESSION_KEY = "acira_x_session";

export interface AuthUser {
  username: string;
  role: string;
  loginTime: string;
}

// ─── Hardcoded demo credentials (MVP only) ────────────────────────────────────
const DEMO_CREDENTIALS = {
  username: "admin",
  password: "admin123",
  role: "SOC Administrator",
};

/**
 * Attempt login. Returns the user object on success, null on failure.
 */
export function login(username: string, password: string): AuthUser | null {
  if (
    username.trim().toLowerCase() === DEMO_CREDENTIALS.username &&
    password === DEMO_CREDENTIALS.password
  ) {
    const user: AuthUser = {
      username: DEMO_CREDENTIALS.username,
      role: DEMO_CREDENTIALS.role,
      loginTime: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
    return user;
  }
  return null;
}

/**
 * Get the currently logged-in user from session storage.
 */
export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if a valid session exists.
 */
export function isAuthenticated(): boolean {
  return getUser() !== null;
}

/**
 * Clear the session (logout).
 */
export function logout(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
