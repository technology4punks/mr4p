export type Capabilities = {
  secure: boolean;
  ar: boolean;
  microphone: boolean;
  webRTC: boolean;
  topLevel: boolean;
};
export async function detectCapabilities(): Promise<Capabilities> {
  let ar = false;
  try {
    ar = (await navigator.xr?.isSessionSupported("immersive-ar")) ?? false;
  } catch {
    /* Denied or unavailable. */
  }
  return {
    secure: isSecureContext,
    ar,
    microphone: !!navigator.mediaDevices?.getUserMedia,
    webRTC: typeof RTCPeerConnection !== "undefined",
    topLevel: window.self === window.top,
  };
}
