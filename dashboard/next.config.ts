import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // googleapis must not be bundled — use native Node.js require
  serverExternalPackages: ['googleapis', 'google-auth-library'],
};

export default nextConfig;
