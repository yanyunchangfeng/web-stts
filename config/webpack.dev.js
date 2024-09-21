const commonConfig = require('./webpack.common');
const { merge } = require('webpack-merge');
// 区分环境
// . --mode 用来设置模块内的process.env.NODE_ENV
// . --env  用来设置webpack配置文件的函数参数
// . cross-env用来设置node环境的 process.env.NODE_ENV
// . DefinePlugin 用来设置模块内的全局变量
module.exports = merge(commonConfig, {
  cache: {
    //Webpack 5 之后，该项用于控制如何缓存编译过程信息与编译结果
    // 不要使用cnpm 来安装模块 会有问题
    type: 'memory' // memory filesystem,  // 默认是在内存中存储
  },
  devServer: {
    // 用于配置与 HMR 强相关的开发服务器功能
    compress: true, //启动压缩 gzip
    open: true, // 启动之后自动打开浏览器
    proxy: {
      '/dev': {
        target: 'http://10.16.11.39:8086',
        changeOrigin: true
      }
    }
  }
});
