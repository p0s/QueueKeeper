import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630
};

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "#f4f1eb",
          color: "#171512",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ fontSize: "24px", color: "#6f685f", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          QueueKeeper
        </div>
        <div style={{ fontSize: "72px", fontWeight: 800, lineHeight: 1.02, maxWidth: "930px" }}>
          Private scout-and-hold procurement for humans and agents.
        </div>
        <div style={{ fontSize: "30px", color: "#4f4943", lineHeight: 1.35 }}>
          Proof-backed micropayments, verified acceptance, and private reveal boundaries.
        </div>
      </div>
    ),
    size
  );
}
