import { homedir } from "os";
import { join } from "path";

export const CONFIG_PATH = join(homedir(), ".canonical-greenhouse.json");
export const MAIN_URL = "https://canonical.greenhouse.io/";
export const SSO_DOMAIN = "login.ubuntu.com";
export const SSO_URL = "https://login.ubuntu.com";

// remove unnecessary fields that could introduce
// unwanted behavior from the new job post
export const FILTERED_ATTRIBUTES = [
    "location_questions",
    "metadata",
    "requisition_id",
    "silo_id",
    "same_content",
    "update_at",
    "created_at",
    "fingerprint",
    "id",
    "first_published",
    "offices",
    "post_type",
    "post_under",
    "prospect_post",
    "public_url",
    "post_type",
    "all_department_ids",
    "all_office_ids",
    "office_ids",
    "questions_for_api",
    "resume_required",
    "compliance",
    "data_compliance",
    "departments",
    "free_job_board_location",
    "greenhouse_job_board_id",
    "iframe_height",
    "job_board_partner_ids",
    "job_board_updated_at",
    "education",
    "live",
    "location",
    "updated_at",
];

export const PROTECTED_JOB_BOARDS = ["Canonical", "INTERNAL"];

export const DEFAULT_HEADER = {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Linux\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
};
