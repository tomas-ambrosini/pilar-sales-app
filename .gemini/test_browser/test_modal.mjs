import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to tablet (like in the screenshot, ~850px)
  await page.setViewport({ width: 850, height: 1024, isMobile: true });
  
  console.log("Navigating to Dashboard...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // We need to find a job card and click it to open the Deal Hub.
  // We can look for the "Deal Hub" button or just any row in the table that has a link.
  // The layout has "Sales Hub" which contains opportunities. Let's go to /sales.
  console.log("Navigating to Sales...");
  await page.goto('http://localhost:5173/sales', { waitUntil: 'networkidle0' });
  
  // Find a job card (usually a div with onClick to open modal)
  // Just take a screenshot of Sales first
  await page.screenshot({ path: 'screenshot_sales.png', fullPage: true });
  console.log("Saved screenshot_sales.png");
  
  // Try to click the first element that looks like an opportunity card.
  // The Sales page has cards with "Deal Hub" buttons or the card itself is clickable.
  try {
    // Wait for the Kanban board to render
    await page.waitForSelector('.bg-white.rounded-xl', { timeout: 5000 });
    
    // Click the first card
    const cards = await page.$$('.bg-white.rounded-xl');
    if (cards.length > 0) {
      console.log("Found card, clicking...");
      await cards[0].click();
      
      // Wait for modal to appear
      await page.waitForTimeout(2000); // give animation time
      
      // Scroll to bottom of the modal's scrollable area
      // The scrollable area is the inner container: .overflow-y-auto
      await page.evaluate(() => {
         const scrollable = document.querySelector('.overflow-y-auto');
         if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
      });
      
      await page.waitForTimeout(500); // wait for scroll to settle
      await page.screenshot({ path: 'screenshot_modal_tablet.png' });
      console.log("Saved screenshot_modal_tablet.png");
    } else {
      console.log("No cards found.");
    }
  } catch (e) {
    console.log("Could not open modal: " + e.message);
  }

  await browser.close();
  console.log("Done");
})();
