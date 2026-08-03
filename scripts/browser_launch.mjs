import fs from "node:fs";

const systemCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export async function launchChromium(chromium) {
  const configured = process.env.VDA_BROWSER_EXECUTABLE;
  if (configured) {
    if (!fs.existsSync(configured)) {
      throw new Error(`VDA_BROWSER_EXECUTABLE does not exist: ${configured}`);
    }
    return chromium.launch({ headless: true, executablePath: configured });
  }
  const systemBrowser = systemCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );
  return chromium.launch(
    systemBrowser
      ? { headless: true, executablePath: systemBrowser }
      : { headless: true }
  );
}
