/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained production server under `.next/standalone`
  // (`server.js` plus a minimal, traced `node_modules`). This lets the app be
  // started with plain `node server.js` instead of the `next` CLI, which is
  // required on Azure App Service: the deployed `node_modules` is repackaged
  // by Oryx and the `node_modules/.bin/next` symlink is not resolvable there,
  // so `next start` fails with `sh: 1: next: not found`.
  output: "standalone",

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
