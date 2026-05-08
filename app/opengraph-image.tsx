import { ImageResponse } from "next/og";
import { SITE_COPY } from "@/lib/site-copy";

export const runtime = "nodejs";
export const alt = SITE_COPY.title;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, rgb(2,6,23) 0%, rgb(15,23,42) 100%)",
          padding: "60px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#e2e8f0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient accents */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "-200px",
            width: "400px",
            height: "400px",
            background: "rgba(59, 130, 246, 0.15)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            right: "-150px",
            width: "300px",
            height: "300px",
            background: "rgba(34, 197, 244, 0.1)",
            borderRadius: "50%",
            filter: "blur(50px)",
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: "1000px",
          }}
        >
          {/* Logo / Branding */}
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "0.12em",
              color: "#3b82f6",
              textTransform: "uppercase",
            }}
          >
            Hollow Metric
          </div>

          {/* Main Headline */}
          <div
            style={{
              fontSize: "64px",
              fontWeight: "900",
              lineHeight: "1.1",
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            {SITE_COPY.mainHeadline}
          </div>

          {/* Supporting Copy */}
          <div
            style={{
              fontSize: "28px",
              fontWeight: "500",
              color: "#cbd5e1",
              marginTop: "8px",
            }}
          >
            {SITE_COPY.supportingCopy}
          </div>

          {/* CTA */}
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#60a5fa",
              marginTop: "16px",
              padding: "12px 24px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "8px",
              background: "rgba(59, 130, 246, 0.1)",
            }}
          >
            {SITE_COPY.ctaText}
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: "16px",
              color: "#64748b",
              marginTop: "20px",
            }}
          >
            {SITE_COPY.url.replace("https://", "").replace("/", "")}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
