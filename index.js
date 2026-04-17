const { connect } = require("puppeteer-real-browser");
const fs = require("fs");
const readline = require("readline");
const UserAgent = require("user-agents"); // <-- [تعديل 1] استيراد مكتبة الـ User Agents

const MY_DOMAIN = "bot.alqawan.com"; 
// ------------------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const generateRandomName = (length = 10) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

(async () => {
  const countInput = await askQuestion("number of accounts ? ");
  const totalAccounts = parseInt(countInput);

  if (isNaN(totalAccounts) || totalAccounts <= 0) {
    rl.close();
    return;
  }

  for (let i = 1; i <= totalAccounts; i++) {
    const randomName = generateRandomName(12);
    const newEmail = `${randomName}@${MY_DOMAIN}`;

    // [تعديل 2] توليد أبعاد شاشة عشوائية لتبدو طبيعية (بين 1366x768 و 1920x1080)
    const randomWidth = Math.floor(Math.random() * (1920 - 1366 + 1)) + 1366;
    const randomHeight = Math.floor(Math.random() * (1080 - 768 + 1)) + 768;

    // [ تعديل 3] توليد User-Agent عشوائي لجهاز كمبيوتر (Desktop)
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });

    console.log(`\n⏳ Attempt [${i}] - Generating Account with: ${newEmail}`);
    console.log(`🖥️  Device Profile: ${randomWidth}x${randomHeight} | ${userAgent.data.userAgent.substring(0, 50)}...`);

    const { browser, page } = await connect({
      headless: false,
      turnstile: true,
      disableXvfb: false,
      ignoreAllFlags: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--incognito",
        "--disable-blink-features=AutomationControlled",
        `--window-size=${randomWidth},${randomHeight}`, // <-- [ تعديل 4] تطبيق الأبعاد على نافذة المتصفح
      ],
    });

    try {
      // [ تعديل 5] تطبيق الـ Viewport والـ User-Agent الجديد على الصفحة
      await page.setViewport({ width: randomWidth, height: randomHeight });
      await page.setUserAgent(userAgent.toString());

      // إخفاء الـ Webdriver
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      });

      // إضافة خصائص إضافية للتمويه (مثل لغة المتصفح والـ Plugins الوهمية)
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      });

      await page.goto(
        // "https://commerce.adobe.com/store/checkout?items%5B0%5D%5Bid%5D=85E283FAC074B6FAB117811DAD30FD6B&cli=creative&co=US&lang=en&ss=commitment",
        "https://commerce.adobe.com/store/confirmation?items%5B0%5D%5Bid%5D=65BA7CA7573834AC4D043B0E7CBD2349&items%5B0%5D%5Bq%5D=1&items%5B1%5D%5Bid%5D=DCB7142784B37C4808BBD2505A79546F&items%5B1%5D%5Bq%5D=1&items%5B2%5D%5Bid%5D=F5B3D59867BC5B6020EFA0763C3AE92A&items%5B2%5D%5Bq%5D=1&rrItems%5B0%5D%5Bid%5D=65BA7CA7573834AC4D043B0E7CBD2349&rrItems%5B0%5D%5Bq%5D=1&rrItems%5B1%5D%5Bid%5D=DCB7142784B37C4808BBD2505A79546F&rrItems%5B1%5D%5Bq%5D=1&cli=mini_plans&co=US&lang=en&sdid=2FDNCC3M&mv=search&mv2=paidsearch&ms=COM&ot=TRIAL&cs=INDIVIDUAL&pa=ccsn_direct_individual&af=uc_new_user_iframe%2Cuc_new_system_close&fps=t&srs=t&apc=CCI_50_3_IP_US&ss=checkout",
        { waitUntil: "networkidle2" },
      );
      await new Promise((r) => setTimeout(r, 2000));

      await page.waitForSelector("input[id='email-input-field']", {
        timeout: 12000,
      });

      // كتابة الإيميل
      await page.type("input[id='email-input-field']", newEmail, {
        delay: Math.floor(Math.random() * (100 - 30 + 1)) + 30,
      });
      await new Promise((r) => setTimeout(r, 2000));
      await page.click("button[data-testid='action-container-cta']");

      await new Promise((r) => setTimeout(r, 4000));

      const frames = page.frames();
      let paymentFrame = null;
      for (const frame of frames) {
        const hasCardInput = await frame
          .$("input[id='card-number']")
          .catch(() => null);
        if (hasCardInput) {
          paymentFrame = frame;
          break;
        }
      }

      if (!paymentFrame) throw new Error("iFrame Not Found!");

      // بيانات الدفع
      await paymentFrame.type("input[id='card-number']", "4758330016284611", { delay: 50 });
      await paymentFrame.type("input[id='expiry-date']", "04/27", { delay: 50 });
      
      await page.type("input[id='firstName']", generateRandomName(6), { delay: 50 });
      await page.type("input[id='lastName']", generateRandomName(6), { delay: 50 });
      await page.type("input[id='postalCode']", "10001", { delay: 50 });

      await new Promise((r) => setTimeout(r, 4000));
      await page.evaluate(() => {
        const buttons = document.querySelectorAll(
          "button[data-testid='action-container-cta']",
        );
        if (buttons[1]) buttons[1].click();
      });

      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("h4")].some((e) =>
            e.textContent.includes("Order Number"),
          ),
        { timeout: 28000 },
      );

      console.log(`🎉 SUCCESS! Account [${i}] Activated: ${newEmail}`);
      fs.appendFileSync("activated_accounts.txt", newEmail + "\n", "utf8");
    } catch (error) {
      console.log(`❌ Account [${i}] FAILED: ${error.message}`);
      await page.screenshot({ path: `error_${i}.png` });

      console.log(`🔄 Retrying Account [${i}] with new data...`);
      const retryBrowser = await connect({
        headless: false,
        turnstile: true,
        disableXvfb: false,
        ignoreAllFlags: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--incognito",
          `--window-size=${randomWidth},${randomHeight}`,
        ],
      });

      const retryPage = await retryBrowser.page;
      try {
        const retryRandomName = generateRandomName(12);
        const retryEmail = `${retryRandomName}@${MY_DOMAIN}`;

        await retryPage.setViewport({ width: randomWidth, height: randomHeight });
        await retryPage.setUserAgent(userAgent.toString());

        await retryPage.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => false });
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        });

        await retryPage.goto(
          "https://commerce.adobe.com/store/confirmation?items%5B0%5D%5Bid%5D=65BA7CA7573834AC4D043B0E7CBD2349&items%5B0%5D%5Bq%5D=1&items%5B1%5D%5Bid%5D=DCB7142784B37C4808BBD2505A79546F&items%5B1%5D%5Bq%5D=1&rrItems%5B0%5D%5Bid%5D=65BA7CA7573834AC4D043B0E7CBD2349&rrItems%5B0%5D%5Bq%5D=1&rrItems%5B1%5D%5Bid%5D=DCB7142784B37C4808BBD2505A79546F&rrItems%5B1%5D%5Bq%5D=1&cli=mini_plans&co=US&lang=en&sdid=2FDNCC3M&mv=search&mv2=paidsearch&ms=COM&ot=TRIAL&cs=INDIVIDUAL&pa=ccsn_direct_individual&af=uc_new_user_iframe%2Cuc_new_system_close&fps=t&srs=t&apc=CCI_50_3_IP_US&ss=checkout",
          { waitUntil: "networkidle2" },
        );

        await retryPage.waitForSelector("input[id='email-input-field']", {
          timeout: 12000,
        });

        await retryPage.type("input[id='email-input-field']", retryEmail, {
          delay: Math.floor(Math.random() * (100 - 30 + 1)) + 30,
        });
        await new Promise((r) => setTimeout(r, 2000));
        await retryPage.click("button[data-testid='action-container-cta-wizard-step-inline']");

        await new Promise((r) => setTimeout(r, 4000));

        const retryFrames = retryPage.frames();
        let retryPaymentFrame = null;
        for (const frame of retryFrames) {
          const hasCardInput = await frame
            .$("input[id='card-number']")
            .catch(() => null);
          if (hasCardInput) {
            retryPaymentFrame = frame;
            break;
          }
        }

        if (!retryPaymentFrame) throw new Error("Retry iFrame Not Found!");

        await retryPaymentFrame.type("input[id='card-number']", "4217836005687031", { delay: 50 });
        await retryPaymentFrame.type("input[id='expiry-date']", "09/27", { delay: 50 });

        await retryPage.type("input[id='firstName']", generateRandomName(6), { delay: 50 });
        await retryPage.type("input[id='lastName']", generateRandomName(6), { delay: 50 });
        await retryPage.type("input[id='postalCode']", "10001", { delay: 50 });

        await new Promise((r) => setTimeout(r, 4000));
        await retryPage.evaluate(() => {
          const buttons = document.querySelector(
            "button[data-daa-ll='Agree and subscribe']",
          );
          if (buttons) buttons.click();
        });

        await retryPage.waitForFunction(
          () =>
            [...document.querySelectorAll("h4")].some((e) =>
              e.textContent.includes("Order Number"),
            ),
          { timeout: 28000 },
        );

        console.log(`🎉 SUCCESS! Retry Account [${i}] Activated: ${retryEmail}`);
        fs.appendFileSync("activated_accounts.txt", retryEmail + "\n", "utf8");
      } catch (retryError) {
        console.log(`❌ Retry Account [${i}] FAILED: ${retryError.message}`);
        await retryPage.screenshot({ path: `retry_error_${i}.png` });
      } finally {
        await retryBrowser.browser.close();
      }
    }

    await browser.close();
  }

  rl.close();
})();
