/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#4338CA',
          light: '#6366F1',
        },
        secondary: {
          DEFAULT: '#F1F5F9',
          dark: '#E2E8F0',
          light: '#F8FAFC',
        },
        accent: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FCD34D',
        },
        background: {
          DEFAULT: '#FFFFFF',
          alt: '#F8FAFC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F8FAFC',
          elevated: '#FFFFFF',
        },
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
          dark: '#CBD5E1',
        },
        status: {
          success: '#10B981',
          'success-light': '#D1FAE5',
          warning: '#F59E0B',
          'warning-light': '#FEF3C7',
          error: '#EF4444',
          'error-light': '#FEE2E2',
          info: '#3B82F6',
          'info-light': '#DBEAFE',
        }
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'heading': ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '3rem',
        '2xl': '4rem',
        'navbar': '70px',
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 2px 4px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'md': '0 4px 8px -2px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'lg': '0 12px 24px -4px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
        'xl': '0 20px 32px -8px rgb(0 0 0 / 0.14), 0 8px 16px -6px rgb(0 0 0 / 0.10)',
        '2xl': '0 32px 64px -12px rgb(0 0 0 / 0.18), 0 12px 24px -8px rgb(0 0 0 / 0.12)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
        'primary': '0 8px 24px -4px rgb(79 70 229 / 0.3)',
        'accent': '0 8px 24px -4px rgb(245 158 11 / 0.3)',
        'success': '0 8px 24px -4px rgb(16 185 129 / 0.3)',
        'error': '0 8px 24px -4px rgb(239 68 68 / 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-accent': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-mesh': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        'gradient-animated': 'linear-gradient(270deg, #667eea, #764ba2, #f093fb, #f5576c)',
        'gradient-body': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideInUp 0.4s ease-out',
        'slide-down': 'slideInDown 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'gradient-flow': 'gradientFlow 15s ease infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideInUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          'from': { opacity: '0', transform: 'translateY(-20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79, 70, 229, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(79, 70, 229, 0.6)' },
        },
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
        gradientFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
}
