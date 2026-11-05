const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cf_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: HeadersInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string>),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let msg = data?.error || data?.message || `HTTP ${res.status}`;
    if (data?.details) {
      try {
        const issues = JSON.parse(data.details);
        if (Array.isArray(issues)) {
          msg = issues.map((i: { message: string }) => i.message).join(", ");
        }
      } catch {
        msg = `${msg}: ${data.details}`;
      }
    }
    throw new Error(msg);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface MiniAppAuthResponse {
  token?: string;
  needsRegistration?: boolean;
  needsLink?: boolean;
  user?: UserProfile;
}

export function miniappAuth(initData: string): Promise<MiniAppAuthResponse> {
  return request("POST", "/api/miniapp/auth", { initData });
}

export function miniappLink(phoneOrPin: string): Promise<{ token: string }> {
  return request("POST", "/api/miniapp/link", { credential: phoneOrPin });
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  accountType: string | null;
  telegramId: string | null;
  telegramLinked: boolean;
  branch?: { id: string; name: string };
}

export function getMe(): Promise<UserProfile> {
  return request("GET", "/api/miniapp/me");
}

// ── Register & Login ──────────────────────────────────────────────────────────
export interface RegisterPayload {
  fullName: string;
  phone: string;
  pinCode: string;
  accountType: string; // "PERSONAL" | "BUSINESS"
}

export function register(
  payload: RegisterPayload
): Promise<{ token: string; user: UserProfile }> {
  return request("POST", "/api/auth/register", payload);
}

export function login(
  phone: string,
  pinCode: string
): Promise<{ token: string; user: UserProfile }> {
  return request("POST", "/api/auth/login", { phone, pinCode });
}

// ── Accounts ──────────────────────────────────────────────────────────────────
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isActive: boolean;
  createdAt: string;
}

// Backend returns { accounts: [...] }
export async function getAccounts(): Promise<BankAccount[]> {
  const data = await request<{ accounts?: BankAccount[] }>("GET", "/api/settings/accounts");
  return Array.isArray(data?.accounts) ? data.accounts : [];
}

export interface AddAccountPayload {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

// Backend returns { account: {...} }
export async function addAccount(payload: AddAccountPayload): Promise<BankAccount> {
  const data = await request<{ account: BankAccount }>("POST", "/api/settings/accounts", payload);
  return data.account;
}

export async function updateAccount(id: string, accountHolderName: string): Promise<BankAccount> {
  const data = await request<{ account: BankAccount }>(
    "PATCH",
    `/api/settings/accounts/${id}`,
    { accountHolderName }
  );
  return data.account;
}

export function deleteAccount(id: string): Promise<void> {
  return request("DELETE", `/api/settings/accounts/${id}`);
}

// Backend toggle reads `isActive` from the body, so send the new desired value
export async function toggleAccount(id: string, currentIsActive: boolean): Promise<BankAccount> {
  const data = await request<{ account: BankAccount }>(
    "PATCH",
    `/api/settings/accounts/${id}/toggle`,
    { isActive: !currentIsActive }
  );
  return data.account;
}