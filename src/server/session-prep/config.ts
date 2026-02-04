export const DEFAULT_UPLOAD_ROOT = "/Users/rezmo/dev/cockpitfiles/out/uploads";

export function getUploadRoot() {
  return process.env.SESSION_PREP_UPLOAD_ROOT || DEFAULT_UPLOAD_ROOT;
}
