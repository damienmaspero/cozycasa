/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect the bare apex domain to the canonical `www` host. This replaces
  // the canonical-host redirect that lived in the legacy Node server.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "thecozycasa.net" }],
        destination: "https://www.thecozycasa.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
