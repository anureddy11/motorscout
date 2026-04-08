import path from "node:path";

export const config = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3000),
  dataDir: path.resolve(process.cwd(), "data"),
  publicDir: path.resolve(process.cwd(), "public")
};
