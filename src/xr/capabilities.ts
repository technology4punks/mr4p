export type Capabilities = {
  secure: boolean;
  ar: boolean;
  vr: boolean;
  microphone: boolean;
  webRTC: boolean;
  topLevel: boolean;
};
export async function detectCapabilities(): Promise<Capabilities> {
  let ar = false,
    vr = false;
  try {
    ar = (await navigator.xr?.isSessionSupported("immersive-ar")) ?? false;
  } catch {
    /* Denied or unavailable. */
  }
  try {
    vr = (await navigator.xr?.isSessionSupported("immersive-vr")) ?? false;
  } catch {
    /* Optional VR fallback. */
  }
  return {
    secure: isSecureContext,
    ar,
    vr,
    microphone: !!navigator.mediaDevices?.getUserMedia,
    webRTC: typeof RTCPeerConnection !== "undefined",
    topLevel: window.self === window.top,
  };
}
