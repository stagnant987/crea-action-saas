/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      colors: {
        bg:      '#07070f',
        surface: '#0e0e1c',
        card:    '#13132a',
        border:  '#1e1e3a',
        border2: '#2a2a4a',
        cyan:    '#00d4ff',
        purple:  '#8b5cf6',
        purple2: '#a78bfa',
        green:   '#10b981',
        red:     '#ef4444',
        yellow:  '#f59e0b',
        text1:   '#e2e8f0',
        text2:   '#94a3b8',
        text3:   '#475569',
      },
      boxShadow: {
        cyan:   '0 0 20px rgba(0,212,255,.15)',
        purple: '0 0 20px rgba(139,92,246,.2)',
        green:  '0 0 20px rgba(16,185,129,.15)',
      },
    },
  },
  plugins: [],
};
