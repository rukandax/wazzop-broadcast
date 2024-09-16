/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://103.127.133.3/whatsapp-api/:path*",
      },
    ];
  },
};

export default nextConfig;
