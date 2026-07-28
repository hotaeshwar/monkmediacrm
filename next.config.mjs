/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.GITHUB_ACTIONS && {
    output: "export"
  }),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
