export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        krypt: {
          black: '#000000',
          void: '#0A0A0F',
          surface: '#141419',
          card: '#16161d',
          border: 'rgba(255,255,255,0.08)',
          muted: '#A1A1AA',
          indigo: '#6366F1',
          purple: '#A855F7',
          pink: '#EC4899',
        },
      },
      fontFamily: {
        sans: [
          'Chakra Petch',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 32px rgba(168,85,247,0.18)',
        'glow-sm': '0 0 18px rgba(168,85,247,0.12)',
        'glow-strong': '0 10px 48px rgba(168,85,247,0.28)',
      },
      backgroundImage: {
        'krypt-gradient':
          'linear-gradient(90deg,#6366F1 0%,#A855F7 50%,#EC4899 100%)',
        'krypt-gradient-soft':
          'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(168,85,247,0.14),rgba(236,72,153,0.12))',
      },
      keyframes: {
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'fade-in': 'fade-in 0.35s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
