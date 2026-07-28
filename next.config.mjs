/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.GITHUB_ACTIONS && {
    output: "export"
  }),
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
