import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ShowTrackr — Track your favorite TV shows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 12 posters arranged in a 4×3 grid — same source as the sign-in collage
const ROWS = [
  [
    "https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",  // Breaking Bad
    "https://image.tmdb.org/t/p/w342/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", // Game of Thrones
    "https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",  // Stranger Things
    "https://image.tmdb.org/t/p/w342/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",  // The Last of Us
  ],
  [
    "https://image.tmdb.org/t/p/w342/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg",  // Peaky Blinders
    "https://image.tmdb.org/t/p/w342/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg",  // Succession
    "https://image.tmdb.org/t/p/w342/7CFCzWIZZcnxHke3yAQiGPWXHwF.jpg",  // Dark
    "https://image.tmdb.org/t/p/w342/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg",  // Better Call Saul
  ],
  [
    "https://image.tmdb.org/t/p/w342/1M876KPjulVwppEpldhdc8V4o68.jpg",  // The Crown
    "https://image.tmdb.org/t/p/w342/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",  // Severance
    "https://image.tmdb.org/t/p/w342/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",  // Squid Game
    "https://image.tmdb.org/t/p/w342/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",  // The Bear
  ],
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Poster grid — 4 columns × 3 rows */}
        {ROWS.map((row, ri) => (
          <div key={ri} style={{ display: "flex", flex: 1 }}>
            {row.map((src, ci) => (
              <div
                key={ci}
                style={{
                  flex: 1,
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Dark gradient overlay — heavier at top and bottom */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.80) 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 56,
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-3px",
              lineHeight: 1,
              marginBottom: 14,
            }}
          >
            ShowTrackr
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.70)",
              fontWeight: 400,
            }}
          >
            Track your favorite TV shows
          </div>
        </div>

        {/* Purple bottom accent */}
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
