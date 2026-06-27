import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const FaceModelContext = createContext(null);

const MODEL_URL = '/models';

export function FaceModelProvider({ children }) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setLoadingError('Không thể tải mô hình nhận diện khuôn mặt');
      }
    };
    load();
  }, []);

  return (
    <FaceModelContext.Provider value={{ modelsLoaded, loadingError }}>
      {children}
    </FaceModelContext.Provider>
  );
}

export function useFaceModels() {
  const ctx = useContext(FaceModelContext);
  if (!ctx) throw new Error('useFaceModels must be used within FaceModelProvider');
  return ctx;
}
