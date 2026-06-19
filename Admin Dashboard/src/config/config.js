/* eslint-disable camelcase */
export const server_url = process.env.REACT_APP_SERVER_URL;
export const ws_server_url = process.env.REACT_APP_WS_SERVER_URL;
export const cloudinary_upload_url =
  process.env.REACT_APP_CLOUDINARY_UPLOAD_URL;
export const cloudinary_category = process.env.REACT_APP_CLOUDINARY_CATEGORY;
export const cloudinary_food = process.env.REACT_APP_CLOUDINARY_FOOD;
export const bcv_api_url = process.env.REACT_APP_BCV_API_URL || "";

function isPrivateHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
  );
}

/** Evita fetch a localhost desde HTTPS (Chrome pide permiso de red local). */
export function getBcvApiBase() {
  const base = (bcv_api_url || "").replace(/\/$/, "");
  if (!base) return "";
  try {
    const parsed = new URL(base);
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      isPrivateHost(parsed.hostname)
    ) {
      return "";
    }
    return base;
  } catch (e) {
    return "";
  }
}
