export const DEFAULT_UPLOAD_ROOT = "/Users/rezmo/dev/cockpitfiles/out/uploads";
export const DEFAULT_CREATED_SESSIONS_ROOT =
  "/Users/rezmo/dev/cockpitfiles/createdsessions";

export function getUploadRoot() {
  return process.env.SESSION_PREP_UPLOAD_ROOT || DEFAULT_UPLOAD_ROOT;
}

export function getCreatedSessionsRoot() {
  return process.env.SESSION_PREP_CREATED_ROOT || DEFAULT_CREATED_SESSIONS_ROOT;
}
