import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve("dist");
const sourceDirectory = path.join(
    distDirectory,
    "assets",
    "node_modules",
    "@expo",
    "vector-icons",
    "build",
    "vendor",
    "react-native-vector-icons",
    "Fonts",
);
const targetDirectory = path.join(distDirectory, "assets", "fonts");

await mkdir(targetDirectory, { recursive: true });

for (const fileName of await readdir(sourceDirectory)) {
    if (!fileName.endsWith(".ttf")) continue;

    await cp(path.join(sourceDirectory, fileName), path.join(targetDirectory, fileName));
}

const sourcePrefix = "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/";
const bundleDirectory = path.join(distDirectory, "_expo", "static", "js", "web");

for (const fileName of await readdir(bundleDirectory)) {
    if (!fileName.endsWith(".js")) continue;

    const bundlePath = path.join(bundleDirectory, fileName);
    const content = await readFile(bundlePath, "utf8");
    const updatedContent = content.replaceAll(sourcePrefix, "/assets/fonts/");

    if (updatedContent !== content) {
        await writeFile(bundlePath, updatedContent);
    }
}

console.log("Prepared icon fonts under dist/assets/fonts");