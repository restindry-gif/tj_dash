import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverActions: {
    bodySizeLimit: "50mb", // 오디오 파일 업로드용 (OpenAI Whisper API 최대 25MB)
  },
};

export default nextConfig;
