/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // TMDB image CDN (new)
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        port: "",
        pathname: "/t/p/**",
      },
      // TVMaze CDN (keep for existing user_shows rows that still have tvmaze poster URLs)
      {
        protocol: "https",
        hostname: "static.tvmaze.com",
        port: "",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
