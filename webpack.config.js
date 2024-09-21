module.exports = (env, argv) => {
  env = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';
  return require(`./config/webpack.${env}`);
};
