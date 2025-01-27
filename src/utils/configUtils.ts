import yaml from "js-yaml";
import fs from "fs";

export function loadConfigFile<T>(filePath: string): T {
    try {
        const config = yaml.load(fs.readFileSync(filePath, "utf8"));
        return config as T;
    } catch {
        throw new Error(`Unable to load config file: '${filePath}'`);
    }
}
