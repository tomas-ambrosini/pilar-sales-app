import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to mobile (iPhone X dimensions)
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  
  console.log("Navigating to Dashboard...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot_dashboard_mobile.png', fullPage: true });
  console.log("Saved screenshot_dashboard_mobile.png");

  console.log("Navigating to Tasks...");
  await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot_tasks_mobile.png', fullPage: true });
  console.log("Saved screenshot_tasks_mobile.png");

  // Try tablet size
  await page.setViewport({ width: 850, height: 1024, isMobile: false });
  console.log("Navigating to Dashboard (Tablet)...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot_dashboard_tablet.png', fullPage: true });

  await browser.close();
  console.log("Done");
})();
