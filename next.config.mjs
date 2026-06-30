/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/supabase-api/:path*',
        destination: 'https://xdejjgeigrbsbkqakari.supabase.co/:path*',
      },
    ];
  },
};

export default nextConfig;
