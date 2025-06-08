let handData = null;

export async function setupHandsTracking() {
  const video = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream;

  const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(results => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handData = results.multiHandLandmarks[0];
    } else {
      handData = null;
    }
  });

  async function detect() {
    await hands.send({image: video});
    requestAnimationFrame(detect);
  }

  video.onloadeddata = () => {
    detect();
  };
}

export function getHandData() {
  return handData;
} 