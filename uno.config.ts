import {
  defineConfig,
  presetIcons,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "forced-color-adjust": "preserve-parent-color",
      },
      warn: true,
      scale: 1.2,
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      gh: {
        bg: "var(--bg)",
        card: "var(--card)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        blue: "var(--blue)",
        green: "var(--green)",
        "green-hover": "var(--green-hover)",
        "green-text": "var(--text-green)",
        "green-bg": "var(--green-bg)",
        red: "var(--red)",
        "red-bg": "var(--red-bg)",
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
});
