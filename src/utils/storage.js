import fs from "fs";
import path from "path";

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveFile(buffer, fullPath) {
  fs.writeFileSync(fullPath, buffer);
}
