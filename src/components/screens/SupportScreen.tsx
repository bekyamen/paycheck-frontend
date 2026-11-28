"use client";

import React from "react";
import SupportContent from "@/components/ui/SupportContent";

interface SupportScreenProps {
  onBack?: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function SupportScreen({ onBack, showToast }: SupportScreenProps) {
  return (
    <div className="screen" style={{ paddingBottom: "80px" }}>
      <div className="screen-content" style={{ padding: "16px" }}>
        <SupportContent onBack={onBack} showToast={showToast} />
      </div>
    </div>
  );
}
