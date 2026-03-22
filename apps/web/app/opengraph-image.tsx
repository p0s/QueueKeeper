import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630
};

export default function OpenGraphImage() {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "#ffffff",
              border: "2px solid #ddd5c8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 800
            }}
          >
            Q
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ fontSize: "24px", color: "#6f685f", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              QueueKeeper
            </div>
            <div style={{ fontSize: "22px", color: "#6f685f" }}>Private Scout-and-Hold Procurement</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "920px"
          }}
        >
          <div style={{ fontSize: "72px", fontWeight: 800, lineHeight: 1.02 }}>
            Privately procure a verified human to scout, hold, or hand off scarce real-world access.
          </div>
          <div style={{ fontSize: "32px", color: "#4f4943", lineHeight: 1.35 }}>
            Pay only for each proof-backed step. Reveal the destination only after verified acceptance.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "18px"
          }}
        >
          {["Human + Agent modes", "Self-gated reveal", "Celo micropayments", "Venice planner"].map((item) => (
            <div
              key={item}
              style={{
                padding: "14px 18px",
                borderRadius: "999px",
                background: "#ffffff",
                border: "1px solid #ddd5c8",
                fontSize: "22px",
                color: "#1f1d19"
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
