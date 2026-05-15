module.exports = (options, webpack) => ({
  ...options,
  externals: [],
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
