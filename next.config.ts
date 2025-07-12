import type { NextConfig } from "next";
const path = require('path');
const fs = require('fs');

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 找到 WASM 文件在 node_modules 中的位置
      const wasmPath = require.resolve('./node_modules/sherpa-onnx/sherpa-onnx-wasm-nodejs.wasm');
      const outputPath = path.join(__dirname, '.next/server/vendor-chunks/');
      const productPath = path.join(__dirname, '.next/server/app/api/sherpa-ncnn/');

      // 确保目录存在
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      if (!fs.existsSync(productPath)) {
        fs.mkdirSync(productPath, { recursive: true });
      }

      // 复制文件
      fs.copyFileSync(
        wasmPath,
        path.join(outputPath, 'sherpa-onnx-wasm-nodejs.wasm')
      );

      fs.copyFileSync(
        wasmPath,
        path.join(productPath, 'sherpa-onnx-wasm-nodejs.wasm')
      );
    }
    return config;
  }
  /* config options here */
};

export default nextConfig;
