/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy Firebase Auth handler to avoid third-party cookie issues
        // This allows signInWithPopup to work on the same domain (nsnexus.com.br)
        source: '/__/auth/:path*',
        destination: 'https://nsnexus-6e027.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
