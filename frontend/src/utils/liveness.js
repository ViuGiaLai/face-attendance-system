/*
 * Liveness detection utilities
 * - Head pose estimation (yaw/pitch from 68 landmarks)
 * - Blink detection (EAR)
 * - Texture analysis (screen artifact detection via canvas)
 */

const EAR_THRESHOLD = 0.18;
const BASELINE_FRAMES = 8;
const BLINK_HISTORY = 15;

// Landmark indices for 68-point model
const NOSE_TIP = 30;
const LEFT_EYE_OUTER = 36;
const RIGHT_EYE_OUTER = 45;
const LEFT_EYE_INNER = 39;
const RIGHT_EYE_INNER = 42;
const CHIN = 8;
const FOREHEAD_MID = 27;

const LEFT_EYE_IDX = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE_IDX = [42, 43, 44, 45, 46, 47];

function getPoint(landmarks, idx) {
  return { x: landmarks[idx].x, y: landmarks[idx].y };
}

function euclidean(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function computeEAR(landmarks) {
  const leftEye = LEFT_EYE_IDX.map(i => getPoint(landmarks, i));
  const rightEye = RIGHT_EYE_IDX.map(i => getPoint(landmarks, i));

  const calc = (eye) => {
    const a = euclidean(eye[1], eye[5]);
    const b = euclidean(eye[2], eye[4]);
    const c = euclidean(eye[0], eye[3]);
    return (a + b) / (2 * c);
  };
  return (calc(leftEye) + calc(rightEye)) / 2;
}

export function estimateHeadPose(landmarks) {
  const nose = getPoint(landmarks, NOSE_TIP);
  const leftEye = getPoint(landmarks, LEFT_EYE_OUTER);
  const rightEye = getPoint(landmarks, RIGHT_EYE_OUTER);
  const chin = getPoint(landmarks, CHIN);
  const leftEyeInner = getPoint(landmarks, LEFT_EYE_INNER);
  const rightEyeInner = getPoint(landmarks, RIGHT_EYE_INNER);

  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const eyeWidth = euclidean(leftEye, rightEye);
  const faceHeight = euclidean(chin, getPoint(landmarks, FOREHEAD_MID));

  const noseOffsetX = (nose.x - eyeCenterX) / eyeWidth;
  const noseOffsetY = (nose.y - eyeCenterY) / faceHeight;

  const eyeDistInner = euclidean(leftEyeInner, rightEyeInner);
  const eyeDistOuter = euclidean(leftEye, rightEye);
  const eyeSymmetry = eyeDistInner / eyeDistOuter;

  const yaw = Math.max(-1, Math.min(1, noseOffsetX * 3));
  const pitch = Math.max(-1, Math.min(1, (noseOffsetY - 0.35) * 4));
  const roll = Math.max(-1, Math.min(1, (eyeSymmetry - 0.42) * 8));

  return { yaw, pitch, roll };
}

export function detectBlink(landmarks, earHistory) {
  if (!landmarks) return { blinked: false, ear: 0, baseline: 0 };

  const ear = computeEAR(landmarks);
  earHistory.push(ear);
  if (earHistory.length > BLINK_HISTORY) earHistory.shift();

  if (earHistory.length < BASELINE_FRAMES) return { blinked: false, ear, baseline: 0 };

  const baseline = earHistory.slice(0, BASELINE_FRAMES).reduce((a, b) => a + b, 0) / BASELINE_FRAMES;
  const minRecent = Math.min(...earHistory.slice(-5));
  const blinked = baseline > 0.22 && minRecent < EAR_THRESHOLD && (baseline - minRecent) > 0.12;

  return { blinked, ear, baseline };
}

export function getHeadPoseLabel(yaw, pitch) {
  if (Math.abs(yaw) < 0.15 && Math.abs(pitch) < 0.15) return 'center';
  if (yaw > 0.25) return 'left';
  if (yaw < -0.25) return 'right';
  if (pitch > 0.2) return 'down';
  if (pitch < -0.2) return 'up';
  return 'center';
}

export function checkChallenge(challenge, landmarks, earHistory) {
  const pose = estimateHeadPose(landmarks);
  const { blinked } = detectBlink(landmarks, earHistory);
  const label = getHeadPoseLabel(pose.yaw, pose.pitch);

  switch (challenge) {
    case 'center':
      return { passed: label === 'center', pose, label };
    case 'left':
      return { passed: label === 'left', pose, label };
    case 'right':
      return { passed: label === 'right', pose, label };
    case 'blink':
      return { passed: blinked, pose, label };
    default:
      return { passed: true, pose, label };
  }
}

export const CHALLENGES = [
  { id: 'center', instruction: 'Nhìn thẳng vào camera', icon: 'straight' },
  { id: 'left', instruction: 'Quay đầu sang trái', icon: 'left' },
  { id: 'right', instruction: 'Quay đầu sang phải', icon: 'right' },
  { id: 'center2', instruction: 'Quay lại nhìn thẳng', icon: 'straight' },
  { id: 'blink', instruction: 'Chớp mắt để xác thực', icon: 'blink' },
];

// Texture-based spoof detection
export async function detectScreenSpoof(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let totalVariation = 0;
      let sharpEdges = 0;
      const sampleSize = Math.min(canvas.width * canvas.height, 50000);
      const step = Math.max(1, Math.floor((canvas.width * canvas.height) / sampleSize));

      for (let i = 0; i < data.length; i += 4 * step) {
        if (i + 4 >= data.length) break;
        const rDiff = Math.abs(data[i] - data[i + 4]);
        const gDiff = Math.abs(data[i + 1] - data[i + 5]);
        const bDiff = Math.abs(data[i + 2] - data[i + 6]);
        const variation = (rDiff + gDiff + bDiff) / 3;
        totalVariation += variation;
        if (variation > 50) sharpEdges++;
      }

      const avgVariation = totalVariation / (data.length / (4 * step));
      const edgeRatio = sharpEdges / (data.length / (4 * step));
      const isReal = avgVariation > 8 && edgeRatio > 0.01;
      const score = Math.min(1, Math.max(0, isReal ? 0.5 + avgVariation / 100 : avgVariation / 100));

      resolve({ isReal, score, avgVariation, edgeRatio });
    };
    img.onerror = () => resolve({ isReal: true, score: 0.5, avgVariation: 0, edgeRatio: 0 });
    img.src = imageSrc;
  });
}
