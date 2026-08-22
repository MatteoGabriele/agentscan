import {
  defineConfig,
  presetIcons,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        'forced-color-adjust': 'preserve-parent-color',
      },
      warn: true,
      scale: 1.2,
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  shortcuts: {
    'pill-action':
      'flex items-center gap-2 rounded-full border-1 border-solid border-ui-border px-4 py-2 text-sm hover:bg-ui-muted/15 transition-all',
  },
  theme: {
    font: {
      mono: "'Roboto', monospace",
      sans: "'Open Sans', system-ui, -apple-system, sans-serif",
    },
    colors: {
      // Theme tokens defined in app/assets/main.css.
      ui: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        destructive: 'var(--destructive)',
        organic: 'var(--organic)',
        mixed: 'var(--mixed)',
        automation: 'var(--automation)',
      },
    },
    animation: {
      keyframes: {
        spin: '{ from { transform: rotate(0deg) } to { transform: rotate(360deg) } }',
        'chevron-float':
          '{ 0%, 100% { transform: translateY(0); opacity: 0.35 } 50% { transform: translateY(7px); opacity: 1 } }',
      },
      durations: {
        spin: '1s',
        'chevron-float': '1.8s',
      },
      timingFns: {
        spin: 'linear',
        'chevron-float': 'ease-in-out',
      },
      counts: {
        spin: 'infinite',
        'chevron-float': 'infinite',
      },
    },
  },
})
