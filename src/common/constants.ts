import { homedir } from "os";
import { join } from "path";

export const MAIN_URL = "https://canonical.greenhouse.io/";
export const SSO_URL = "https://login.ubuntu.com";
export const CONFIG_PATH = join(homedir(), ".canonical-greenhouse.json");
