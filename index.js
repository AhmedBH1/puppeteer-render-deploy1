import express from "express";
import puppeteer from "puppeteer";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();

app.get("/", async (req, res) => {
    try {
        console.log("Server UP!", {request: req});
        res.send({ msg: "Server is running.", success: true, status_code: 200 });
    } catch (error) {
        console.error("Error running the script:", error);
        res.status(500).send({
            msg: "Error running the script. Check the logs for more details.",
            success: false,
            status_code: 500
        });
    }
});

app.get("/scrape", async (req, res) => {
    let browser;
    try {
        try {
            console.log("Starting Puppeteer...");

            const browser = await puppeteer.launch({
                args: [
                    "--disable-setuid-sandbox",
                    "--no-sandbox",
                    "--single-process",
                    "--no-zygote",
                ],
                timeout: 120000,  // Increasing the timeout to 60 seconds
            });

            const page = await browser.newPage();
            console.log("User-Agent:", await page.evaluate(() => navigator.userAgent));


            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            
            page.on('response', async (response) => {
                console.log(`📡 AJAX Response: ${response.url()}`);
            });
            
            await page.goto("https://www.kupujemprodajem.com/bela-tehnika-i-kucni-aparati/ves-masine/pretraga?categoryId=15&groupId=188&locationId=1&priceTo=150&currency=eur&order=posted%20desc", {
                timeout: 90000,  // Povećaj na 90 sekundi
                waitUntil: "networkidle2",  // Možeš probati i 'networkidle2', domcontentloaded
            });

            const actualUserAgent = await page.evaluate(() => navigator.userAgent);
console.log("✅ Trenutni User-Agent:", actualUserAgent);
            console.log("🌍 Stranica učitana. Čekam oglase...");
           
            const cookieButton = await page.$('button[aria-label="Prihvati"]'); 
            if (cookieButton) {
                await cookieButton.click();
                console.log("✅ Kliknuto na dugme za kolačiće");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Sačekaj još malo da se oglasi učitaju
                }

            async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
        });
    });
}
            
            const title = await page.title();
            
            
            await new Promise(resolve => setTimeout(resolve, 10000));
            
        const isSelectorPresent = await page.$('.AdItem_adOuterHolder__lACeh') !== null;
        if (!isSelectorPresent) {
            console.log("⚠️ Selektor nije pronađen. Proveri strukturu stranice!");

            // Preuzmi i ispiši ceo HTML sadržaj stranice
            const pageContent = await page.content();
            console.log("📄 HTML sadržaj stranice:\n", pageContent);

            res.status(500).send({
                msg: "Selektor nije pronađen.",
                success: false,
                html: pageContent, // Možeš videti u odgovoru servera
            });
            return;
        }


        await page.waitForSelector('.AdItem_adOuterHolder__lACeh', { timeout: 90000 });

        const ads = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.AdItem_adOuterHolder__lACeh'))
                .map(ad => ad.id.match(/\d+/)?.[0])
                .filter(Boolean);
        });

        console.log(`🔍 Pronađeno ${ads.length} oglasa.`);

            console.log("Puppeteer started successfully!");
            res.send({ads});
        } catch (error) {
            console.error("Error starting Puppeteer:", error);
            res.status(500).send({
                msg: "Error starting Puppeteer.",
                error: error,
                success: false,
                status_code: 500
            });
        }
    } catch (error) {
        console.error("Error running Puppeteer:", error);
        res.status(500).send({
            msg: "Error running Puppeteer. Check the logs for more details.",
            error: error,
            success: false,
            status_code: 500
        });
    } finally {
        if (browser) {
            await page.close();
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` 🚀  Server running on port ${PORT}`);
});
