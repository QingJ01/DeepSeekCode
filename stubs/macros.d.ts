/**
 * Compile-time macros injected by Bun's bundler.
 * These are replaced with string literals during bundling.
 * For our source build, we provide runtime values.
 */

declare const MACRO: {
  VERSION: string
  BUILD_TIME: string
  FEEDBACK_CHANNEL: string
  ISSUES_EXPLAINER: string
  NATIVE_PACKAGE_URL: string
  PACKAGE_URL: string
  VERSION_CHANGELOG: string
}
