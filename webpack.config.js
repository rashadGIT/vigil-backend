const nodeExternals = require('webpack-node-externals');

module.exports = (options, webpack) => ({
  ...options,
  externals: [
    nodeExternals({
      allowlist: [/@prisma\/client/, /prisma/],
    }),
  ],
  plugins: [
    ...options.plugins,
    // Suppress dynamic-require warnings for optional NestJS peer deps not used in this app
    new webpack.IgnorePlugin({
      checkResource(resource) {
        return [
          '@nestjs/microservices',
          '@nestjs/websockets/socket-module',
          'fastify',
          'hbs',
        ].some((dep) => resource.startsWith(dep));
      },
    }),
  ],
});
