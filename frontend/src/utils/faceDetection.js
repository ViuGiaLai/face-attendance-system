import * as faceapi from 'face-api.js';
import { getFaceDetectionOptions } from './modelLoader';

// Path to the models directory in the public folder
const MODEL_URL = '/models';

/**
 * Load face detection models
 */
export const loadFaceDetectionModels = async () => {
  try {
    // Load only essential models for face detection
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    
    console.log('Face detection models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw new Error('Không thể tải mô hình nhận diện khuôn mặt. Vui lòng tải lại trang.');
  }
};

/**
 * Detect faces in an image or video element
 * @param {HTMLImageElement|HTMLVideoElement} imageElement - The image or video element to detect faces in
 * @returns {Promise<Array>} Array of face detections with landmarks
 */
export const detectFaces = async (imageElement) => {
  try {
    if (!imageElement) {
      throw new Error('No image element provided');
    }

    // Get optimized detection options
    const detectionOptions = getFaceDetectionOptions();
    
    // Detect faces with landmarks (no face descriptors for better performance)
    const detections = await faceapi
      .detectAllFaces(imageElement, detectionOptions)
      .withFaceLandmarks();
      
    return detections;
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw new Error('Không thể nhận diện khuôn mặt. Vui lòng thử lại.');
  }
};

/**
 * Draw face detections on a canvas
 * @param {HTMLCanvasElement} canvas - The canvas to draw on
 * @param {Array} detections - Array of face detections
 * @param {Object} options - Drawing options
 * @param {boolean} options.drawBoxes - Whether to draw detection boxes
 * @param {boolean} options.drawLandmarks - Whether to draw facial landmarks
 */
export const drawDetections = (canvas, detections, options = {}) => {
  const {
    drawBoxes = true,
    drawLandmarks = true
  } = options;
  
  const ctx = canvas.getContext('2d');
  
  // Clear previous drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!detections || detections.length === 0) {
    return;
  }
  
  // Draw detections
  if (drawBoxes) {
    faceapi.draw.drawDetections(canvas, detections);
  }
  
  // Draw landmarks
  if (drawLandmarks) {
    faceapi.draw.drawFaceLandmarks(canvas, detections);
  }
};

/**
 * Get the face area as an image
 * @param {HTMLImageElement|HTMLVideoElement} imageElement - Source image/video element
 * @param {Object} detection - Face detection result
 * @returns {HTMLCanvasElement} Canvas element with the cropped face
 */
export const extractFaceImage = (imageElement, detection) => {
  const { box } = detection;
  
  // Create a canvas for the face
  const canvas = document.createElement('canvas');
  canvas.width = box.width;
  canvas.height = box.height;
  
  const ctx = canvas.getContext('2d');
  
  // Draw the face on the canvas
  ctx.drawImage(
    imageElement,
    box.x, box.y, box.width, box.height, // source rectangle
    0, 0, box.width, box.height          // destination rectangle
  );
  
  return canvas;
};
