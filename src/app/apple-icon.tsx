import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
        }}
      >
        <svg viewBox="0 0 512 512" width={160} height={160} aria-hidden>
          <line
            x1="96"
            y1="256"
            x2="416"
            y2="256"
            stroke="#38BDF8"
            strokeWidth={28}
            strokeLinecap="round"
          />
          <rect x="118" y="180" width="30" height="152" rx="10" fill="#38BDF8" />
          <rect x="154" y="200" width="22" height="112" rx="8" fill="#38BDF8" />
          <rect x="364" y="180" width="30" height="152" rx="10" fill="#38BDF8" />
          <rect x="336" y="200" width="22" height="112" rx="8" fill="#38BDF8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
