/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  sassOptions: {
    // Bootstrap 5.3 still uses @import and legacy color functions; silence those
    // dependency warnings so real issues in our own styles stay visible.
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
  },
};

export default nextConfig;
