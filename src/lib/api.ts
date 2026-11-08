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
    throw new Error("Network error. Please check your internet connection and try again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let msg = data?.error || data?.message || `Request failed (${res.status})`;
    if (data?.details) {
      try {
        const issues = typeof data.details === "string" ? JSON.parse(data.details) : data.details;
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
export interface UserProfile {
  id: string;
  fullName: string;
  phone: string | null;
  role: string;
  isAdmin?: boolean;
  accountType?: string | null;
  organizationId?: string;
  organizationName?: string;
  branchId?: string;
  branchName?: string;
  branch?: { id: string; name: string };
  telegramId?: string | null;
  telegramLinked?: boolean;
  accountsCount?: number;
  cashiersCount?: number;
}

export interface MiniAppAuthResponse {
  token?: string;
  needsRegistration?: boolean;
  user?: UserProfile;
}

export function miniappAuth(initData: string): Promise<MiniAppAuthResponse> {
  return request("POST", "/api/miniapp/auth", { initData });
}

export function miniappLink(initData: string): Promise<{ ok: boolean }> {
  return request("POST", "/api/miniapp/link", { initData });
}

function getTgInitData(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp?.initData || undefined;
}

export function getMe(): Promise<{ user: UserProfile }> {
  return request("GET", "/api/auth/me");
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  pinCode: string;
  accountType: string; // "PERSONAL" | "BUSINESS"
  initData?: string;
}

export function register(
  payload: RegisterPayload
): Promise<{ message: string; token: string; user: UserProfile }> {
  return request("POST", "/api/auth/register", {
    ...payload,
    initData: payload.initData || getTgInitData(),
  });
}

export function login(
  phone: string,
  pinCode: string,
  initData?: string
): Promise<{ message: string; token: string; user: UserProfile }> {
  return request("POST", "/api/auth/login", {
    phone,
    pinCode,
    initData: initData || getTgInitData(),
  });
}

export interface CashierPasswordLoginPayload {
  password: string;
  fullName?: string;
  branchId?: string;
  initData?: string;
}

export type CashierInfo = UserProfile;

export function cashierPasswordLogin(
  payload: CashierPasswordLoginPayload
): Promise<{ message: string; token: string; cashier: UserProfile; user: UserProfile }> {
  return request("POST", "/api/auth/cashier-login", {
    ...payload,
    initData: payload.initData || getTgInitData(),
  });
}

export function cashierTokenLogin(payload: { pin: string; branchId?: string }): Promise<{ token: string; cashier: UserProfile }> {
  return cashierPasswordLogin({ password: payload.pin, branchId: payload.branchId });
}

export function logout(): Promise<{ message: string }> {
  return request("POST", "/api/auth/logout");
}

// ── Receiving Accounts ────────────────────────────────────────────────────────
export interface BankAccount {
  id: string;
  organizationId?: string;
  bankName: "CBE" | "TELEBIRR" | string;
  accountNumber: string;
  accountHolderName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccountsResponse {
  accounts: BankAccount[];
  grouped: {
    CBE?: BankAccount[];
    TELEBIRR?: BankAccount[];
    [key: string]: BankAccount[] | undefined;
  };
}

export async function getAccounts(): Promise<AccountsResponse> {
  const data = await request<AccountsResponse>("GET", "/api/settings/accounts");
  return {
    accounts: Array.isArray(data?.accounts) ? data.accounts : [],
    grouped: data?.grouped || { CBE: [], TELEBIRR: [] },
  };
}

export interface AddAccountPayload {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export async function addAccount(payload: AddAccountPayload): Promise<{ message: string; account: BankAccount }> {
  return request("POST", "/api/settings/accounts", payload);
}

export async function updateAccount(id: string, accountHolderName: string): Promise<{ message: string; account: BankAccount }> {
  return request("PATCH", `/api/settings/accounts/${id}`, { accountHolderName });
}

export async function toggleAccount(id: string, isActive: boolean): Promise<{ message: string; account: BankAccount }> {
  return request("PATCH", `/api/settings/accounts/${id}/toggle`, { isActive });
}

export async function deleteAccount(id: string): Promise<{ message: string; ok: boolean }> {
  return request("DELETE", `/api/settings/accounts/${id}`);
}

// ── Cashiers Management ───────────────────────────────────────────────────────
export interface CashierItem {
  id: string;
  fullName: string;
  role: string;
  branchId: string;
  branchName: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function getCashiers(): Promise<CashierItem[]> {
  const data = await request<{ cashiers?: CashierItem[] }>("GET", "/api/cashiers");
  return Array.isArray(data?.cashiers) ? data.cashiers : [];
}

export interface CreateCashierPayload {
  fullName: string;
  password: string;
}

export async function createCashier(payload: CreateCashierPayload): Promise<{ message: string; cashier: CashierItem }> {
  return request("POST", "/api/cashiers", payload);
}

export interface UpdateCashierPayload {
  fullName?: string;
  password?: string;
  active?: boolean;
}

export async function updateCashier(id: string, payload: UpdateCashierPayload): Promise<{ message: string; cashier: CashierItem }> {
  return request("PATCH", `/api/cashiers/${id}`, payload);
}

export async function setCashierStatus(id: string, active: boolean): Promise<{ message: string; cashier: CashierItem }> {
  return request("PATCH", `/api/cashiers/${id}/status`, { active });
}

export async function deleteCashier(id: string): Promise<{ message: string; ok: boolean }> {
  return request("DELETE", `/api/cashiers/${id}`);
}

// ── Payment Verification ──────────────────────────────────────────────────────
export interface VerificationResult {
  status: "VERIFIED" | "FLAGGED_DUPLICATE" | "AMOUNT_MISMATCH" | "INVALID" | "INVALID_RECEIPT" | "FAILED_UPSTREAM" | string;
  provider?: string;
  txnReference?: string;
  amount?: number | string;
  expectedAmount?: number | string;
  payerName?: string;
  payerPhone?: string;
  verifiedAt?: string;
  message?: string;
}

export function verifyManual(payload: {
  provider: string;
  txnReference: string;
  amount: number;
  expectedAmount?: number;
  payerPhone?: string;
}): Promise<VerificationResult> {
  return request("POST", "/api/verify/manual", payload);
}

export function verifyText(payload: {
  rawText: string;
  expectedAmount?: number;
}): Promise<VerificationResult> {
  return request("POST", "/api/verify/text", payload);
}

export function verifyUrl(payload: {
  receiptUrl: string;
  expectedAmount?: number;
}): Promise<VerificationResult> {
  return request("POST", "/api/verify/url", payload);
}

export async function verifyImage(file: File, expectedAmount?: number, provider?: string): Promise<VerificationResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("receipt", file);
  if (expectedAmount) {
    formData.append("expectedAmount", expectedAmount.toString());
  }
  if (provider) {
    formData.append("provider", provider);
  }

  const res = await fetch(`${BASE_URL}/api/verify/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Image verification failed");
  }
  return data as VerificationResult;
}
