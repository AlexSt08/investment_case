/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['*.supabase.co', 'logo.clearbit.com'],
  },
}

module.exports = nextConfig
