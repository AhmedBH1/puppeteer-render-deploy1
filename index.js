import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "chrome-aws-lambda";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== ROOT ==========
app.get("/", (req, res) => {
  res.send({
    msg: "🟢 Puppeteer Proxy Running",
    endpoints: ["/screenshot?url=", "/html?url=", "/cookies?url="],
    status: "success",
  });
});

// ========== Browser Launcher ==========
async function launchBrowser() {
  const executablePath = "/usr/bin/google-chrome"; // ✅ Matches Dockerfile

  return await puppeteer.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--headless'
    ]
  });
}


// ========== /screenshot ==========
app.get("/screenshot", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: "Invalid or missing URL" });
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 20000 });

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await browser.close();

    res.set("Content-Type", "image/png");
    res.send(screenshotBuffer);
  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ Screenshot Error:", err.message);
    res.status(500).json({ error: "Failed to fetch screenshot", details: err.message });
  }
});

// ========== /html ==========
app.get("/html", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: "Invalid or missing URL" });
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    const content = await page.content();
    await browser.close();

    res.set("Content-Type", "text/html");
    res.send(content);
  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ HTML Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch HTML", details: err.message });
  }
});

// ========== /cookies ==========
app.get("/cookies", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: "Invalid or missing URL" });
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    const cookies = await page.cookies();
    await browser.close();

    res.json({ cookies });
  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ Cookie Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch cookies", details: err.message });
  }
});

// ========== LAUNCH ==========
const PORT = process.env.PORT || 3000;
console.log("🛠 Render assigned PORT:", PORT);

app.listen(PORT, () => {
  console.log(`✅ Puppeteer proxy running on port ${PORT}`);
});
