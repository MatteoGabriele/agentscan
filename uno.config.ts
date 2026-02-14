import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
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
          background: #030712;
          color: #d1d5db;
          min-height: 100vh;
        }
      `,
    },
  ],
});
