import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        fun: ['"Comic Sans MS"', '"Comic Neue"', 'cursive', 'sans-serif'],
      },
      colors: {
        road: '#8B7355',
        grass: '#7EC850',
        sky: '#87CEEB',
        milestone: {
          reached: '#FFD700',
          unreached: '#B0B0B0',
        },
      },
    },
  },
  plugins: [],
};

export default config;
