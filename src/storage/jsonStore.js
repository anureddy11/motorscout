import fs from "node:fs/promises";
import path from "node:path";

export class JsonStore {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  async ensureFile(fileName, fallbackValue) {
    const filePath = path.join(this.baseDir, fileName);
    try {
      await fs.access(filePath);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(fallbackValue, null, 2));
    }
    return filePath;
  }

  async read(fileName, fallbackValue) {
    const filePath = await this.ensureFile(fileName, fallbackValue);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  }

  async write(fileName, value) {
    const filePath = await this.ensureFile(fileName, value);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    return value;
  }
}
