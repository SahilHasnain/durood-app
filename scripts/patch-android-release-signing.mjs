import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const androidProjectPath = process.env.ANDROID_PROJECT_DIR || "android";
const gradlePath = path.join(androidProjectPath, "app", "build.gradle");
const keystorePath = process.env.ANDROID_KEYSTORE_PATH;

const appConfigCandidates = [
  "app.config.js",
  "app.config.ts",
  "app.config.mjs",
  "app.config.cjs",
  "app.json",
];

function readVersionCodeFromAppConfig() {
  const configPath = appConfigCandidates
    .map((file) => path.join(projectRoot, file))
    .find((file) => fs.existsSync(file));

  if (!configPath) {
    return undefined;
  }

  const content = fs.readFileSync(configPath, "utf8");

  if (configPath.endsWith(".json")) {
    const config = JSON.parse(content);
    const versionCode = config?.expo?.android?.versionCode;
    return versionCode == null ? undefined : String(versionCode);
  }

  const match = content.match(/versionCode\s*:\s*(\d+)/);
  return match ? match[1] : undefined;
}

// Prefer an explicit override. Otherwise use the Expo app config so the AAB
// matches the versionCode that android-ci incremented and committed.
const versionCode = process.env.ANDROID_VERSION_CODE || readVersionCodeFromAppConfig();

if (!keystorePath || !versionCode || !/^\d+$/.test(versionCode)) {
  throw new Error(
    "Production signing path and numeric versionCode are required. " +
      "Set ANDROID_VERSION_CODE or define expo.android.versionCode in app.config.js/app.json.",
  );
}

let gradle = fs.readFileSync(gradlePath, "utf8");

if (!gradle.includes('storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))')) {
  const signingConfigsPattern = /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n\s*\})(\s*\})/;
  if (!signingConfigsPattern.test(gradle)) {
    throw new Error("Could not locate the generated Android signingConfigs block.");
  }
  gradle = gradle.replace(
    signingConfigsPattern,
    '$1\n        release {\n            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))\n            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("ANDROID_KEY_ALIAS")\n            keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n        }\n    }',
  );
}

const releaseSigningPattern = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig\s+(?:System\.getenv\("ANDROID_KEYSTORE_PATH"\)\s*\?\s*signingConfigs\.release\s*:\s*signingConfigs\.debug|signingConfigs\.debug)/;
if (!releaseSigningPattern.test(gradle)) {
  if (!/buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+signingConfigs\.release/.test(gradle)) {
    throw new Error("Could not configure the generated release build type to use the release keystore.");
  }
} else {
  gradle = gradle.replace(releaseSigningPattern, "$1signingConfig signingConfigs.release");
}

if (!gradle.includes(`versionCode ${versionCode}`)) {
  const versionCodePattern = /versionCode\s+\d+/;
  if (!versionCodePattern.test(gradle)) {
    throw new Error("Could not locate the generated Android versionCode.");
  }
  gradle = gradle.replace(versionCodePattern, `versionCode ${versionCode}`);
}

fs.writeFileSync(gradlePath, gradle);
console.log(`Configured Android release signing with versionCode ${versionCode}.`);
