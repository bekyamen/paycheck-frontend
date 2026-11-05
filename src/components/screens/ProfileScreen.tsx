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
      <span style={{ fontSize: "14px", color: "var(--tg-theme-hint-color)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

export default function ProfileScreen({ user, onLogout }: ProfileScreenProps) {
  const tgUser = getTelegramUser();
  const avatarLetter = user.fullName?.[0]?.toUpperCase() ?? "?";

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
            padding: "28px 0 24px",
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
                border: "3px solid var(--tg-theme-button-color)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
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
                background: "rgba(10,132,255,0.15)",
                color: "var(--tg-theme-link-color)",
              }}
            >
              {user.role}
            </span>
          </div>
        </div>

        {/* Info card */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <InfoRow label="Phone" value={user.phone} />
          <InfoRow label="Account Type" value={user.accountType ?? "—"} />
          {user.branch && <InfoRow label="Branch" value={user.branch.name} />}
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

        {/* Telegram user detail if available */}
        {tgUser && (
          <div className="card" style={{ marginBottom: "16px" }}>
            <p className="section-label" style={{ marginBottom: "8px" }}>Telegram Info</p>
            <InfoRow label="First Name" value={tgUser.first_name} />
            {tgUser.last_name && <InfoRow label="Last Name" value={tgUser.last_name} />}
            {tgUser.username && <InfoRow label="Username" value={`@${tgUser.username}`} />}
            <InfoRow label="Telegram ID" value={String(tgUser.id)} />
          </div>
        )}

        {/* Logout */}
        <button
          id="logout-btn"
          className="btn btn-danger"
          onClick={onLogout}
          style={{ marginTop: "8px" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
