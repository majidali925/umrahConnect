/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Signed-in and one-off auth pages stay out of search results.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    return ['/account', '/account/:path*', '/agency', '/agency/:path*', '/login', '/verify-otp', '/forgot-password', '/reset-password'].map(
      (source) => ({ source, headers: noindex }),
    );
  },
  sassOptions: {
    // Bootstrap 5.3 still uses @import and legacy color functions; silence those
    // dependency warnings so real issues in our own styles stay visible.
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
  },
};

export default nextConfig;
