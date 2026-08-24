import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "summer-songs",
  brand: {
    displayName: "오늘의 여름노래",
    primaryColor: "#E8542E",
    icon: "https://static.toss.im/appsintoss/50705/69720a36-a053-4ece-b4f7-968b57f815ff.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [{ name: "geolocation", access: "access" }],
  outdir: "dist",
});
