import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import { configSchema, type Config } from "../schemas/config";

const CONFIG_DIR = join(homedir(), ".italki");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export async function readConfig(): Promise<Config | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const json = JSON.parse(raw);
    return configSchema.parse(json);
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function writeConfig(config: Config): Promise<void> {
  return saveConfig(config);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export async function clearConfig(): Promise<void> {
  try {
    await fs.unlink(CONFIG_PATH);
  } catch {
    // already gone
  }
}

export function resolveTimezone(flag: string | undefined, config: Config | null, fallback: string): string {
  if (flag) return flag;
  if (config?.timezone_iana) return config.timezone_iana;
  return fallback;
}
