const { chromium } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3000', OUT = process.argv[2] || require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'ats-shots-')), PW = 'Meridian@2026';
const ok = (m) => console.log('PASS', m);
const expect = (c, m) => { if (!c) throw new Error(m); ok(m); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !/401|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('dialog', d => d.accept());
  const signIn = async (email, pw) => { await page.fill('#email', email); await page.fill('#password', pw); await page.click('button:has-text("Sign in")'); };
  const menu = () => page.locator('aside details summary').first();

  await page.goto(B + '/jobs');
  expect(page.url().includes('/login?next=%2Fjobs'), 'protected page redirects to login');
  await page.screenshot({ path: OUT + '/01-login.png' });

  await signIn('anjali@meridian.example', 'wrong-pass1');
  await page.getByText('Incorrect email or password').waitFor(); ok('wrong password rejected');

  await signIn('anjali@meridian.example', PW);
  await page.waitForURL('**/jobs'); ok('login as Head of TA returns to requested page');
  await page.getByText('temporary password').first().waitFor(); ok('temp-password banner shown');

  // Head creates a hiring manager with own email + password
  await page.goto(B + '/team');
  await page.fill('#nu-name', 'Kavya Shetty'); await page.fill('#nu-email', 'kavya@meridian.example');
  await page.selectOption('#nu-role', 'hiring_manager'); await page.fill('#nu-pw', 'Welcome123');
  await page.click('button:has-text("Create account")');
  await page.getByText('Kavya Shetty can now sign in').waitFor(); ok('Head creates hiring-manager account');
  // Head creates recruiter with generated password
  await page.fill('#nu-name', 'Neha Patil'); await page.fill('#nu-email', 'neha@meridian.example');
  await page.click('button:has-text("Create account")');
  await page.getByText('Neha Patil can now sign in').waitFor();
  const nehaPw = (await page.locator('code').first().textContent()).trim();
  ok('generated temp password shown: ' + nehaPw);
  await page.screenshot({ path: OUT + '/02-team.png', fullPage: true });

  // Add another account (multi-account)
  await menu().click(); await page.click('text=+ Add another account');
  await page.getByText('Add another account').first().waitFor();
  await signIn('kavya@meridian.example', 'Welcome123');
  await page.waitForURL('**/dashboard');
  await page.getByText('Hiring-manager view').waitFor(); ok('second account signed in and active (Kavya, HM)');
  expect(await page.locator('nav a:has-text("Team")').count() === 0, 'HM does not see Team page link');
  await page.goto(B + '/team'); expect(page.url().endsWith('/dashboard'), 'HM blocked from /team');

  await menu().click();
  await page.screenshot({ path: OUT + '/03-switcher.png' });
  await page.locator('aside form button:has-text("Anjali Deshpande")').click();
  await page.waitForURL('**/dashboard');
  await page.locator('nav a:has-text("Team")').waitFor(); ok('switched back to Anjali without re-entering password');

  // switch to Kavya, change password
  await menu().click(); await page.locator('aside form button:has-text("Kavya Shetty")').click();
  await page.getByText('Hiring-manager view').waitFor();
  await page.goto(B + '/account');
  await page.fill('#current', 'Welcome123'); await page.fill('#next', 'short'); await page.fill('#confirm', 'short');
  await page.click('button:has-text("Update password")');
  await page.getByText('at least 8 characters').first().waitFor(); ok('weak password rejected');
  await page.fill('#current', 'Welcome123'); await page.fill('#next', 'KavyaNew2026'); await page.fill('#confirm', 'KavyaNew2026');
  await page.click('button:has-text("Update password")');
  await page.getByText('Password updated').waitFor(); ok('user changes own password');
  expect(await page.getByText('using a temporary password').count() === 0, 'temp banner gone after change');

  // sign out of Kavya only -> Anjali remains
  await menu().click(); await page.click('button:has-text("Sign out of Kavya")');
  await page.waitForURL('**/dashboard'); await page.locator('nav a:has-text("Team")').waitFor();
  ok('signing out one account keeps the other signed in');

  // Head deactivates Kavya; Kavya can no longer sign in
  await page.goto(B + '/team');
  await page.locator('tr', { hasText: 'kavya@meridian.example' }).locator('button:has-text("Deactivate")').click();
  await page.locator('tr', { hasText: 'kavya@meridian.example' }).getByText('Deactivated').waitFor(); ok('Head deactivates account');

  // fresh browser: deactivated, new recruiter, lockout
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  const s2 = async (e, pw) => { await p2.goto(B + '/login?add=1'); await p2.fill('#email', e); await p2.fill('#password', pw); await p2.click('button:has-text("Sign in")'); };
  await s2('kavya@meridian.example', 'KavyaNew2026'); await p2.getByText('deactivated').waitFor(); ok('deactivated user cannot sign in');
  await s2('neha@meridian.example', nehaPw); await p2.waitForURL('**/dashboard'); ok('new recruiter signs in with generated password');
  for (let i = 0; i < 5; i++) { await s2('rohit@meridian.example', 'nope' + i + 'x'); await p2.getByText('Incorrect').waitFor(); }
  await s2('rohit@meridian.example', PW); await p2.getByText('Too many failed attempts').waitFor(); ok('lockout after 5 failed attempts (even with right password)');

  // sign out all in main browser
  await page.goto(B + '/dashboard'); await menu().click();
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('**/login'); ok('sign out of last account → login page');
  await page.goto(B + '/dashboard'); expect(page.url().includes('/login'), 'dashboard locked after sign-out');

  const c = await ctx.cookies(); console.log('cookies:', c.map(x => `${x.name} httpOnly=${x.httpOnly} sameSite=${x.sameSite}`).join(', ') || 'none left');
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
