// Playwright reads PLAYWRIGHT_BROWSERS_PATH when its registry module loads.
// Setting it here, before any Playwright import, pins the browser location to
// the project-local package so the server and the app bundle do not depend on
// shell configuration. An explicit value from the environment wins.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";
