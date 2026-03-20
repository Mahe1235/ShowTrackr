import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ShowTrackr — Track your favorite TV shows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Purple glow blob */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(108,99,255,0.30) 0%, transparent 70%)",
            top: 15,
            left: 300,
          }}
        />

        {/* App icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "#6C63FF",
            marginBottom: 32,
          }}
        >
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <rect
              x="2"
              y="4"
              width="20"
              height="14"
              rx="2"
              stroke="white"
              strokeWidth="2"
            />
            <line
              x1="8"
              y1="21"
              x2="16"
              y2="21"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="18"
              x2="12"
              y2="21"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-3px",
            marginBottom: 20,
            lineHeight: 1,
          }}
        >
          ShowTrackr
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 30,
            color: "rgba(255,255,255,0.55)",
            fontWeight: 400,
          }}
        >
          Track your favorite TV shows
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background:
              "linear-gradient(90deg, transparent, #6C63FF, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
