const Sentry = require("@sentry/node");
const dotenv = require("dotenv");
dotenv.config();

const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  console.log("SENTRY_DSN is not set");
} else {
  console.log("SENTRY_DSN is set");
}

// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});