import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f1eb",
          color: "#1f1d19",
          borderRadius: 32,
          border: "8px solid #ddd5c8",
          fontSize: 92,
          fontWeight: 800
        }}
      >
        Q
      </div>
    ),
    size
  );
}
