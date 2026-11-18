const { chromium } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3000', OUT = process.argv[2] || require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'ats-shots-'));
const ok = (m) => console.log('PASS', m);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));

  await page.goto(B + '/'); await page.screenshot({ path: OUT + '/01-landing.png' });
  await page.goto(B + '/login'); await page.fill('#email', 'anjali@meridian.example'); await page.fill('#password', 'Meridian@2026');
  await page.click('button:has-text("Sign in")'); await page.waitForURL('**/dashboard');
  await page.goto(B + '/dashboard'); await page.screenshot({ path: OUT + '/02-dashboard.png', fullPage: true }); ok('dashboard loads');

  // Create job (recruiter flow, as Head of TA)
  await page.goto(B + '/jobs/new');
  await page.fill('input[name=title]', 'Java Microservices Lead');
  await page.fill('input[name=skills]', 'Java, Spring Boot, Kafka');
  await page.selectOption('select[name=clientId]', { label: 'Northwind Bank (US)' });
  await page.fill('input[name=project]', 'Card Platform');
  await page.fill('input[name=billingRateUsd]', '50');
  await page.selectOption('select[name=recruiterId]', { label: 'Sneha Iyer' });
  await page.click('button:has-text("Create requisition")');
  await page.waitForURL(/\/jobs\/[0-9a-f-]{36}$/);
  const jobUrl = page.url();
  await page.getByText('REQ-0009').first().waitFor(); ok('create job → REQ-0009');

  // Add candidate with a DUPLICATE phone → warning must block
  await page.click('a:has-text("+ Add candidate")');
  await page.fill('input[name=name]', 'Aarav M.');
  await page.fill('input[name=phone]', '+91 98220-10001');
  await page.fill('input[name=email]', 'aarav.new@mail.example');
  await page.getByText('Possible duplicate').waitFor(); ok('live duplicate warning shown');
  await page.screenshot({ path: OUT + '/03-duplicate-warning.png', fullPage: true });
  await page.check('input[name=consent]');
  await page.click('button:has-text("Save candidate")');
  await page.getByText('may already exist').waitFor(); ok('server blocks duplicate without confirmation');

  // Fresh candidate
  await page.goto(B + '/candidates/new?jobId=' + jobUrl.split('/').pop());
  await page.fill('input[name=name]', 'Tanvi Kale');
  await page.fill('input[name=phone]', '98765 43210');
  await page.fill('input[name=email]', 'tanvi.kale@mail.example');
  await page.fill('input[name=currentCompany]', 'Infosys');
  await page.fill('input[name=totalExpYears]', '7');
  await page.fill('input[name=currentCtcLpa]', '16');
  await page.fill('input[name=expectedCtcLpa]', '22');
  await page.selectOption('select[name=noticeDays]', '60');
  await page.fill('input[name=skills]', 'Java, Kafka, AWS');
  await page.selectOption('select[name=source]', 'Consultancy');
  await page.selectOption('select[name=sourceDetail]', 'Apex HR Partners');
  await page.check('input[name=consent]');
  await page.click('button:has-text("Save candidate")');
  await page.waitForURL(/\/candidates\/[0-9a-f-]{36}$/); ok('create candidate + apply to job');
  await page.getByText('Notice exceeds target').waitFor(); ok('notice-period fit flagged (60d > 21d)');

  // Stage movement forward x2, back x1
  await page.click('button[title="Move to Screened"]');
  await page.click('button[title="Move to Internal Interview"]');
  await page.click('button[title="Move to Screened"]');
  await page.locator('ol li').filter({ hasText: 'Internal Interview → Screened' }).waitFor(); ok('stage forward/back with timestamped history');

  // Note
  await page.fill('textarea[name=body]', 'Has competing offer from TCS at 21 LPA.');
  await page.click('button:has-text("Add note")');
  await page.getByText('Has competing offer from TCS').waitFor(); ok('note added with author + time');

  // Drop out with reason
  await page.click('summary:has-text("✕")');
  const drop = page.locator('form').filter({ hasText: "Dropped out (candidate's decision)" });
  await drop.locator('select[name=reason]').selectOption('Accepted another offer');
  await drop.locator('button:has-text("OK")').click();
  await page.locator('ol li').filter({ hasText: 'Accepted another offer' }).waitFor(); ok('drop-out with reason code');
  await page.screenshot({ path: OUT + '/04-candidate.png', fullPage: true });

  await page.goto(jobUrl); await page.screenshot({ path: OUT + '/05-job-pipeline.png', fullPage: true });
  await page.goto(B + '/jobs/j-1'); await page.screenshot({ path: OUT + '/06-job-j1.png', fullPage: true });

  // Skill search
  await page.goto(B + '/candidates?skill=kafka&maxNotice=60');
  const n = await page.locator('tbody tr').count(); console.log('kafka<=60d rows', n);
  await page.screenshot({ path: OUT + '/07-candidates-search.png', fullPage: true });

  // Hiring manager: read only
  await page.goto(B + '/dashboard');
  await page.goto(B + '/login?add=1'); await page.fill('#email', 'vikram@meridian.example'); await page.fill('#password', 'Meridian@2026');
  await page.click('button:has-text("Sign in")'); await page.waitForURL('**/dashboard');
  await page.getByText('Hiring-manager view').waitFor();
  await page.goto(B + '/jobs/j-1');
  if (await page.locator('button[title^="Move to"]').count()) throw new Error('HM can move stages'); ok('hiring manager is read-only');
  await page.goto(B + '/jobs'); await page.screenshot({ path: OUT + '/08-jobs.png', fullPage: true });

  // mobile
  const m = page; await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(B + '/dashboard'); await m.screenshot({ path: OUT + '/09-mobile.png' });
  const sw = await m.evaluate(() => document.documentElement.scrollWidth); console.log('mobile scrollWidth', sw);

  console.log('console/page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
