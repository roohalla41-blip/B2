import tailwindcssAnimate from 'tailwindcss-animate';

const hsl = (name) => `hsl(var(--${name}))`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: hsl('border'), input: hsl('input'), ring: hsl('ring'),
        background: hsl('background'), foreground: hsl('foreground'),
        primary: { DEFAULT: hsl('primary'), foreground: hsl('primary-foreground') },
        secondary: { DEFAULT: hsl('secondary'), foreground: hsl('secondary-foreground') },
        destructive: { DEFAULT: hsl('destructive'), foreground: hsl('destructive-foreground') },
        muted: { DEFAULT: hsl('muted'), foreground: hsl('muted-foreground') },
        accent: { DEFAULT: hsl('accent'), foreground: hsl('accent-foreground') },
        popover: { DEFAULT: hsl('popover'), foreground: hsl('popover-foreground') },
        card: { DEFAULT: hsl('card'), foreground: hsl('card-foreground') },
        success: { DEFAULT: hsl('success'), foreground: hsl('success-foreground') },
        warning: { DEFAULT: hsl('warning'), foreground: hsl('warning-foreground') },
        info: { DEFAULT: hsl('info'), foreground: hsl('info-foreground') },
        chart: { 1: hsl('chart-1'), 2: hsl('chart-2'), 3: hsl('chart-3'), 4: hsl('chart-4'), 5: hsl('chart-5') },
        sidebar: {
          DEFAULT: hsl('sidebar-background'), foreground: hsl('sidebar-foreground'),
          primary: hsl('sidebar-primary'), 'primary-foreground': hsl('sidebar-primary-foreground'),
          accent: hsl('sidebar-accent'), 'accent-foreground': hsl('sidebar-accent-foreground'),
          border: hsl('sidebar-border'), ring: hsl('sidebar-ring')
        }
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['Vazirmatn', 'ui-sans-serif', 'system-ui'],
        body: ['Vazirmatn', 'ui-sans-serif', 'system-ui'],
        heading: ['Vazirmatn', 'ui-sans-serif', 'system-ui'],
        display: ['Vazirmatn', 'ui-sans-serif', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: { 'accordion-down': 'accordion-down 0.2s ease-out', 'accordion-up': 'accordion-up 0.2s ease-out' }
    }
  },
  plugins: [tailwindcssAnimate]
};
