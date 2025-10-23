import * as faceapi from 'face-api.js';

// Path to models in the public directory
const MODEL_URL = '/models';

// Check if models are already loaded
let modelsLoaded = false;

// Only include essential models for face detection
const ESSENTIAL_MODELS = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1'
];

/**
 * Check if all essential model files exist
 */
async function checkModelFiles() {
  try {
    const results = await Promise.all(
      ESSENTIAL_MODELS.map(file => 
        fetch(`${MODEL_URL}/${file}`)
          .then(res => res.ok)
          .catch(() => false)
      )
    );
    return results.every(exists => exists);
  } catch (error) {
    console.error('Error checking model files:', error);
    return false;
  }
}

/**
 * Load face detection models with progress callback
 */
export async function loadModels() {
  if (modelsLoaded) {
    return true;
  }

  try {
    // Check if models exist
    const modelsExist = await checkModelFiles();
    if (!modelsExist) {
      throw new Error('Required model files are missing');
    }

    // Load only essential models for face detection
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    
    console.log('Essential face detection models loaded successfully');
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error('Error loading models:', error);
    throw new Error('Không thể tải mô hình nhận diện khuôn mặt. Vui lòng tải lại trang.');
  }
}

/**
 * Get face detection options
 */
export function getFaceDetectionOptions() {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: 160,  // Smaller size for faster detection
    scoreThreshold: 0.3  // Slightly lower threshold for better detection
  });
}

/**
 * Download models (for backward compatibility)
 */
export async function downloadModels() {
  console.warn('downloadModels() is deprecated. Models should be included in the public/models directory.');
  return true;
}

// Utility function to get model status
export function getModelStatus() {
  return {
    loaded: modelsLoaded,
    tinyFaceDetector: !!faceapi.nets.tinyFaceDetector.params,
    faceLandmark68Net: !!faceapi.nets.faceLandmark68Net.params,
    faceRecognitionNet: !!faceapi.nets.faceRecognitionNet.params
  };
}
