# End-to-end browser tests

Real-browser tests (Playwright + Chromium) of the lab manual's testing checklist and the client's must-haves.
They need **fresh seed data** (they expect the next requisition to be `REQ-0009`).

```bash
rm -rf .data && npm run build && npm start          # terminal 1 (http://localhost:3000)
npm i --no-save playwright && npx playwright install chromium   # once
node tests/e2e/features.e2e.js    # jobs, candidates, duplicates, pipeline, notes, roles, mobile
node tests/e2e/auth.e2e.js        # sign-in, lockout, team admin, account switcher, sign-out
```

Each check prints `PASS …`; the first failure prints `FAIL …` and exits with code 1.
Set `BASE_URL` to test another server. Screenshots go to a temp folder (or the path given as the first argument).
