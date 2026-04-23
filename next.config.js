/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "polaroid-event-fotos.s3.us-east-1.amazonaws.com",
      },
    ],
  },
};

module.exports = nextConfig;
