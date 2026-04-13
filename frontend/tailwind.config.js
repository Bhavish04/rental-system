/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0d0e12',
        bg2:      '#13141a',
        bg3:      '#1a1b23',
        card:     '#1e1f28',
        card2:    '#22232e',
        accent:   '#e8a87c',
        accent2:  '#d4886a',
        teal:     '#6ec6c0',
        green:    '#7ec97f',
        red:      '#e07070',
        blue:     '#6fa3e0',
        text1:    '#f0f0f4',
        text2:    '#9a9aae',
        text3:    '#5c5c72',
        border:   'rgba(255,255,255,0.07)',
        border2:  'rgba(255,255,255,0.12)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      borderRadius: {
        xl2: '20px',
      }
    }
  },
  plugins: []
}
