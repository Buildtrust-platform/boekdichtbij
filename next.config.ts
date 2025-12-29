import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify handles SSR automatically

  // Redirects for backwards compatibility
  async redirects() {
    return [
      // Old /rotterdam/ridderkerk/kapper -> new herenkapper
      {
        source: "/rotterdam/ridderkerk/kapper",
        destination: "/rotterdam/ridderkerk/herenkapper",
        permanent: true,
      },
      {
        source: "/rotterdam/ridderkerk/kapper/success",
        destination: "/rotterdam/ridderkerk/herenkapper/success",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
