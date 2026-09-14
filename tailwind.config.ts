import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

/**
 * PairFit design tokens.
 *
 * Color philosophy:
 *   - `brand` (coral) — represents "her / partner A", warmth & affection
 *   - `accent` (teal) — represents "him / partner B", vitality & fitness
 *   - Together they encode the dual-goal couple experience.
 *
 * Light + dark palettes are mirrored so semantic contrast feels the same
 * in both modes (e.g. `brand-500` is the same hue intensity).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // Primary brand — coral / rose (partner A)
        brand: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#FF6B6B',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },
        // Accent — teal / vitality (partner B)
        accent: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Semantic
        success: {
          DEFAULT: '#10B981',
          soft: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          soft: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          soft: '#FEE2E2',
        },
        info: {
          DEFAULT: '#3B82F6',
          soft: '#DBEAFE',
        },
        // Surfaces
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#FAFAF9',
          sunken: '#F5F5F4',
        },
        ink: {
          DEFAULT: '#1C1917',
          muted: '#57534E',
          subtle: '#A8A29E',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Noto Sans SC"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Use Tailwind defaults; we only add display sizes.
        'display-2xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
      },
      spacing: {
        // 4-pt baseline grid already implicit; explicit named tokens for the
        // design system docs.
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        full: '9999px',
      },
      boxShadow: {
        // Soft, native-app-style shadows.
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        sm: '0 2px 4px -1px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        DEFAULT: '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        md: '0 8px 24px -4px rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.06)',
        lg: '0 20px 40px -8px rgb(0 0 0 / 0.12), 0 8px 16px -8px rgb(0 0 0 / 0.08)',
        glow: '0 0 0 6px rgb(255 107 107 / 0.12)',
        'glow-accent': '0 0 0 6px rgb(20 184 166 / 0.14)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        // Cheer / PF-6 — emoji floater travels from bottom-center up
        // past the top edge with a slight scale + fade.
        'float-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 0) scale(0.8)' },
          '15%': { opacity: '1', transform: 'translate(-50%, -8px) scale(1)' },
          '85%': { opacity: '1', transform: 'translate(-50%, -160px) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -200px) scale(0.95)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slide-up 280ms cubic-bezier(0.25, 1, 0.5, 1)',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'float-up': 'float-up 1.8s cubic-bezier(0.33, 1, 0.68, 1) forwards',
      },
    },
  },
  plugins: [typography],
};

export default config;
