// Temporary UI pause: keep the local AI implementation, but do not expose it
// from normal app navigation or the legacy sidecar launcher.
//
// SECURITY / SCOPE: Browser/local-AI experiments belong in the separate
// repository oriex-embedded-ai-lab. This main-app local-AI path must remain
// disabled / isolated and must NOT be reachable from the normal student/teacher
// UI. Keep this flag false in production.
export const LOCAL_AI_UI_ENABLED = false;
