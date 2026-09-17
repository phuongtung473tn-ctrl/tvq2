const ACCESS_TOKEN_KEY = "funnel_supabase_access_token_v1";

function tokenIsExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(
      atob(
        normalizedPayload.padEnd(
          Math.ceil(normalizedPayload.length / 4) * 4,
          "=",
        ),
      ),
    ) as {
      exp?: unknown;
    };
    return (
      typeof claims.exp === "number" &&
      claims.exp <= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSupabaseAccessToken(): string {
  if (!isBrowser()) return "";
  try {
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY) || "";
    if (token && tokenIsExpired(token)) {
      window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      return "";
    }
    return token;
  } catch {
    return "";
  }
}

export function clearSupabaseAccessToken(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* storage may be blocked */
  }
}

export async function signInWithSupabase(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<boolean> {
  if (!url || !anonKey || !email || !password || !isBrowser()) return false;
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!response.ok) return false;
    const payload = (await response.json()) as {
      access_token?: unknown;
      user?: { id?: unknown };
    };
    if (typeof payload.access_token !== "string" || !payload.access_token) {
      return false;
    }
    const userResponse = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${payload.access_token}`,
      },
    });
    if (!userResponse.ok) return false;
    const user = (await userResponse.json()) as { id?: unknown };
    if (typeof user.id !== "string" || !user.id) return false;
    const adminResponse = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&enabled=eq.true&select=user_id&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${payload.access_token}`,
        },
      },
    );
    if (!adminResponse.ok) return false;
    const admins = (await adminResponse.json()) as unknown[];
    if (!Array.isArray(admins) || admins.length === 0) return false;
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
    return true;
  } catch {
    return false;
  }
}
