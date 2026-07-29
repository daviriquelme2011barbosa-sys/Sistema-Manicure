import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          pressed: "var(--color-primary-pressed)",
          soft: "var(--color-primary-soft)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary-hover)",
        },
        bg: "var(--color-bg)",
        surface: { DEFAULT: "var(--color-surface)", 2: "var(--color-surface-2)" },
        sidebar: "var(--color-sidebar)",
        topbar: "var(--color-topbar)",
        hover: "var(--color-hover)",
        border: { DEFAULT: "var(--color-border)", strong: "var(--color-border-strong)" },
        divider: "var(--color-divider)",
        text: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          onPrimary: "var(--color-text-on-primary)",
        },
        success: { DEFAULT: "var(--color-success)", soft: "var(--color-success-soft)" },
        warning: { DEFAULT: "var(--color-warning)", soft: "var(--color-warning-soft)" },
        danger: { DEFAULT: "var(--color-danger)", soft: "var(--color-danger-soft)" },
        info: "var(--color-info)",
      },
      borderRadius: {
        sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)",
        xl: "var(--radius-xl)", "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)", md: "var(--shadow-md)",
        lg: "var(--shadow-lg)", xl: "var(--shadow-xl)",
      },
      fontFamily: { sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      fontSize: {
        "2xs": ["11px", "14px"], xs: ["12px", "16px"], sm: ["13px", "20px"],
        base: ["14px", "22px"], md: ["16px", "24px"], lg: ["18px", "26px"],
        xl: ["20px", "28px"], "2xl": ["24px", "32px"], "3xl": ["28px", "36px"],
        "4xl": ["34px", "42px"],
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.4,0,.2,1)",
        "ease-out-soft": "cubic-bezier(0,0,.2,1)",
        spring: "cubic-bezier(.34,1.56,.64,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
