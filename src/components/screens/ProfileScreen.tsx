"use client";
import { getTelegramUser } from "@/lib/telegram";
import type { UserProfile } from "@/lib/api";

interface ProfileScreenProps {
  user: UserProfile;
  onLogout: () => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <span style={{ fontSize: "14px", color: "var(--tg-theme-hint-color, #8e8e93)", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: "14px", fontWeight: 600, textAlign: "right", maxWidth: "65%" }}>
        {value}
      </span>
    </div>
  );
}

export default function ProfileScreen({ user, onLogout }: ProfileScreenProps) {
  const tgUser = getTelegramUser();
  const avatarLetter = user.fullName?.[0]?.toUpperCase() ?? "?";
  const isAdmin = user.isAdmin ?? (user.role === "OWNER" || user.role === "MANAGER" || user.role === "ADMIN");

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Profile</h1>
      </div>

      <div className="screen-content">
        {/* Avatar + name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px 0 20px",
            gap: "12px",
          }}
        >
          {tgUser?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tgUser.photo_url}
              alt="Profile"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "3px solid var(--tg-theme-button-color, #0a84ff)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: isAdmin
                  ? "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)"
                  : "linear-gradient(135deg, #30d158 0%, #0a84ff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: 800,
                color: "#fff",
                boxShadow: "0 6px 24px rgba(10,132,255,0.35)",
              }}
            >
              {avatarLetter}
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: "20px" }}>{user.fullName}</p>
            <span
              className="badge"
              style={{
                marginTop: "6px",
                background: isAdmin ? "rgba(10,132,255,0.15)" : "rgba(48,209,88,0.15)",
                color: isAdmin ? "var(--tg-theme-link-color, #0a84ff)" : "#30d158",
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {isAdmin ? "Business Admin" : "Cashier"}
            </span>
          </div>
        </div>

        {/* Business details for Admin or Branch for Cashier */}
        <div className="card" style={{ marginBottom: "16px" }}>
          {user.organizationName && (
            <InfoRow label="Business" value={user.organizationName} />
          )}
          {(user.branchName || user.branch?.name) && (
            <InfoRow label="Branch" value={user.branchName || user.branch?.name} />
          )}
          {user.phone && (
            <InfoRow label="Phone" value={user.phone} />
          )}
          {user.accountType && (
            <InfoRow label="Account Type" value={user.accountType} />
          )}
          {isAdmin && user.accountsCount !== undefined && (
            <InfoRow label="Receiving Accounts" value={`${user.accountsCount} configured`} />
          )}
          {isAdmin && user.cashiersCount !== undefined && (
            <InfoRow label="Cashiers" value={`${user.cashiersCount} active`} />
          )}
          <InfoRow
            label="Telegram"
            value={
              user.telegramLinked ? (
                <span className="text-success">
                  ✓ Linked{tgUser?.username ? ` @${tgUser.username}` : ""}
                </span>
              ) : (
                <span className="text-muted">Not linked</span>
              )
            }
          />
        </div>

        {/* Telegram User Details (if opened inside Telegram) */}
        {tgUser && (
          <div className="card" style={{ marginBottom: "16px" }}>
            <p className="section-label" style={{ marginBottom: "8px" }}>Telegram Account</p>
            <InfoRow label="Telegram Name" value={`${tgUser.first_name} ${tgUser.last_name || ""}`.trim()} />
            {tgUser.username && <InfoRow label="Username" value={`@${tgUser.username}`} />}
            <InfoRow label="Telegram ID" value={String(tgUser.id)} />
          </div>
        )}

        {/* Sign Out Button */}
        <button
          id="logout-btn"
          type="button"
          className="btn btn-danger"
          onClick={onLogout}
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            fontWeight: 700,
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
