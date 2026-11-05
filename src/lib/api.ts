const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

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

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
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
  accountType: string;
}

export function register(payload: RegisterPayload): Promise<{ token: string; user: UserProfile }> {
  return request("POST", "/api/auth/register", payload);
}

export function login(phone: string, pinCode: string): Promise<{ token: string; user: UserProfile }> {
  return request("POST", "/api/auth/login", { phone, pinCode });
}

// ── Accounts ──────────────────────────────────────────────────────────────────
export interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  holderName: string;
  isActive: boolean;
  createdAt: string;
}

export function getAccounts(): Promise<BankAccount[]> {
  return request("GET", "/api/settings/accounts");
}

export interface AddAccountPayload {
  bank: string;
  accountNumber: string;
  holderName: string;
}

export function addAccount(payload: AddAccountPayload): Promise<BankAccount> {
  return request("POST", "/api/settings/accounts", payload);
}

export function updateAccount(id: string, holderName: string): Promise<BankAccount> {
  return request("PATCH", `/api/settings/accounts/${id}`, { holderName });
}

export function deleteAccount(id: string): Promise<void> {
  return request("DELETE", `/api/settings/accounts/${id}`);
}

export function toggleAccount(id: string): Promise<BankAccount> {
  return request("PATCH", `/api/settings/accounts/${id}/toggle`);
}
