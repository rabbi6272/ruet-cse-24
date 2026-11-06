/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix Windows OneDrive symlink issues
  outputFileTracingIncludes: {},
  outputFileTracingExcludes: {},

  images: {
    remotePatterns: [
      new URL(
        "https://res.cloudinary.com/ddtd7avvo/image/upload/v1770146066/Users/**",
      ),
    ],
  },

  // Disable symlinks to avoid Windows/OneDrive issues
  typescript: {
    ignoreBuildErrors: false,
  },

  // SEO and Performance optimizations
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml" },
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain" },
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400",
          },
        ],
      },
    ];
  },

  // Enable compression
  compress: true,

  // Generate static sitemap
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // Enable trailing slash for consistent URLs
  trailingSlash: false,

  // Allow dev origins for cross-origin requests
  allowedDevOrigins: ["192.168.56.1", "192.168.0.235"],

  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN;
    if (!apiOrigin) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin.replace(/\/+$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
