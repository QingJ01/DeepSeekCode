// Global compile-time MACRO constants
// In the real Bun build, these are injected via --define at compile time.
// Here we provide runtime values matching the local package version.
declare global {
  const MACRO: {
    VERSION: string
    BUILD_TIME: string
    FEEDBACK_CHANNEL: string
    ISSUES_EXPLAINER: string
    ISSUES_EXPLAINER_URL: string
    FEEDBACK_CHANNEL_URL: string
    NATIVE_PACKAGE_URL: string | null
    PACKAGE_URL: string
    VERSION_CHANGELOG: string
  }
}

// This is never actually executed — the global is set in the entrypoint wrapper.
// But we need it so TypeScript doesn't complain about `MACRO` being undeclared.
export {}
