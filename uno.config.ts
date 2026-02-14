import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      gh: {
        bg: "#0d1117",
        card: "#161b22",
        border: "#30363d",
        "border-light": "#21262d",
        text: "#c9d1d9",
        muted: "#8b949e",
        blue: "#58a6ff",
        green: "#238636",
        "green-hover": "#2ea043",
        "green-text": "#3fb950",
        "green-bg": "#0d2818",
        red: "#f85149",
        "red-bg": "#3d1515",
      },
    },
    animation: {
      keyframes: {
        spin: "{ from { transform: rotate(0deg) } to { transform: rotate(360deg) } }",
      },
      durations: {
        spin: "1s",
      },
      timingFns: {
        spin: "linear",
      },
      counts: {
        spin: "infinite",
      },
    },
  },
  preflights: [
    {
      getCSS: () => `
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          min-height: 100vh;
        }
      `,
    },
  ],
});
