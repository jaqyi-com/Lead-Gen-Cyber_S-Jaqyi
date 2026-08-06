import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'google-auth-library', 'nodemailer'],
};

export default nextConfig;
