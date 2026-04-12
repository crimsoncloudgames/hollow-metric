export const TESTING_ADMIN_EMAIL = "crimsoncloudg@gmail.com";
export const TEMPORARY_TESTING_LOCK_MESSAGE =
  "This feature is still being tested. Access is currently limited.";

function normalizeEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isTestingAdminEmail(email: string | null | undefined) {
  return normalizeEmail(email) === TESTING_ADMIN_EMAIL;
}