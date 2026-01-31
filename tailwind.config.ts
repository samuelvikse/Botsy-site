import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        botsy: {
          dark: '#1A243E',
          'dark-deep': '#141C32',
          'dark-surface': '#1E2A4A',
          lime: '#bad532',
          'lime-light': '#c8e048',
          'lime-dark': '#a5c02d',
          'lime-muted': '#8fa828',
        },
        success: '#00B894',
        warning: '#FDCB6E',
        error: '#E74C3C',
        info: '#74B9FF',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'lime-glow': '0 0 40px rgba(186, 213, 50, 0.35)',
        'lime-glow-sm': '0 0 20px rgba(186, 213, 50, 0.25)',
        'lime-glow-lg': '0 0 60px rgba(186, 213, 50, 0.5)',
        'lime-glow-xl': '0 0 100px rgba(186, 213, 50, 0.4)',
        'dark': '0 4px 30px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 10px 60px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'lime-gradient': 'linear-gradient(135deg, #bad532 0%, #a5c02d 100%)',
        'lime-gradient-radial': 'radial-gradient(circle, rgba(186, 213, 50, 0.15) 0%, transparent 70%)',
        'dark-gradient': 'linear-gradient(180deg, #1A243E 0%, #141C32 100%)',
        'dark-radial': 'radial-gradient(ellipse at top, #1E2A4A 0%, #1A243E 50%, #141C32 100%)',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(186, 213, 50, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(186, 213, 50, 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(30, 42, 74, 0.8) 0px, transparent 50%)',
      },
      borderRadius: {
        'botsy': '12px',
        'botsy-lg': '16px',
        'botsy-xl': '24px',
        'botsy-2xl': '32px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.6s ease-out forwards',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 40px rgba(186, 213, 50, 0.35)' },
          '50%': { boxShadow: '0 0 60px rgba(186, 213, 50, 0.5)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
