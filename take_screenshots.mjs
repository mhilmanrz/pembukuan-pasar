import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set to mobile dimensions (iPhone 12/13/14 size)
  await page.setViewport({ width: 390, height: 844 });

  console.log('Taking Dashboard screenshot...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  await setTimeout(2000); // give time for chart to render
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: false });

  console.log('Taking Barang Masuk screenshot...');
  await page.goto('http://localhost:5174/barang-masuk', { waitUntil: 'networkidle0' });
  await setTimeout(2000);
  await page.screenshot({ path: 'docs/screenshots/barang_masuk.png', fullPage: false });

  console.log('Taking Penjualan screenshot...');
  await page.goto('http://localhost:5174/penjualan', { waitUntil: 'networkidle0' });
  await setTimeout(2000);
  await page.screenshot({ path: 'docs/screenshots/penjualan.png', fullPage: false });

  console.log('Taking Hutang/Piutang screenshot...');
  await page.goto('http://localhost:5174/hutang-piutang', { waitUntil: 'networkidle0' });
  await setTimeout(2000);
  await page.screenshot({ path: 'docs/screenshots/hutang_piutang.png', fullPage: false });

  await browser.close();
  console.log('✅ Done!');
})();
