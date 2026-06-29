# app/services/face_engine.py
try:
    import dlib
    dlib_available = True
except ImportError:
    dlib = None
    dlib_available = False
import numpy as np
import json
import cv2
from PIL import Image
import io
import base64
import os
from collections import defaultdict
from typing import Optional, Tuple, Dict, List, Union

current_dir = os.path.dirname(os.path.abspath(__file__))

class FaceEngine:
    def __init__(self, tolerance=0.6):
        self.tolerance = tolerance
        self.detector = None
        self.shape_predictor = None
        self.face_encoder = None
        self._models_loaded = False
        
        self.dlib_available = dlib_available
        
        # Match face_engine_simple.py structure
        self.temp_face_encodings = defaultdict(list)
        self.known_face_encodings = []
        self.known_face_ids = []

    def load_models(self) -> None:
        """Load required models with error handling."""
        if not self.dlib_available:
            print("WARNING: dlib is not installed. Dlib models will not be loaded. Real AI face recognition is unavailable.")
            return

        if self._models_loaded:
            return

        try:
            if self.detector is None:
                self.detector = dlib.get_frontal_face_detector()

            predictor_path = os.path.join(current_dir, 'shape_predictor_68_face_landmarks.dat')
            if not os.path.exists(predictor_path):
                raise FileNotFoundError(f"Shape predictor model not found at: {predictor_path}")
            self.shape_predictor = dlib.shape_predictor(predictor_path)

            model_path = os.path.join(current_dir, 'dlib_face_recognition_resnet_model_v1.dat')
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Face recognition model not found at: {model_path}")
            self.face_encoder = dlib.face_recognition_model_v1(model_path)
            
            self._models_loaded = True
            print("Dlib models loaded successfully")
        except Exception as e:
            self.shape_predictor = None
            self.face_encoder = None
            self._models_loaded = False
            raise RuntimeError(f"Failed to load models: {str(e)}")

    def load_face_encodings_from_db(self, users=None):
        """Load face encodings from FaceEmbedding table, falling back to user database if empty."""
        self.known_face_encodings = []
        self.known_face_ids = []
        
        try:
            from app.models.face_embedding import FaceEmbedding
            from app.models.user import User
            
            # Query all active embeddings
            embeddings = FaceEmbedding.query.join(User).filter(User.is_active == True).all()
            
            if embeddings:
                for fe in embeddings:
                    try:
                        encoding = json.loads(fe.embedding)
                        self.known_face_encodings.append(np.array(encoding, dtype=np.float32))
                        self.known_face_ids.append(fe.user_id)
                    except Exception as e:
                        print(f"Error parsing face embedding {fe.id}: {e}")
                print(f"Loaded {len(embeddings)} face embeddings from database table")
            else:
                # Fallback to User.face_encodings if table is empty
                print("No records in face_embeddings table. Trying fallback to User.face_encodings...")
                target_users = users if users is not None else User.query.filter(User.face_encodings.isnot(None), User.is_active == True).all()
                for user in target_users:
                    if user.face_encodings and user.is_active:
                        try:
                            encodings_list = json.loads(user.face_encodings)
                            for encoding in encodings_list:
                                self.known_face_encodings.append(np.array(encoding, dtype=np.float32))
                                self.known_face_ids.append(user.id)
                            print(f"Loaded {len(encodings_list)} fallback face encodings for user {user.name}")
                        except Exception as e:
                            print(f"Error loading fallback face encodings for user {user.id}: {e}")
        except Exception as e:
            print(f"Error in load_face_encodings_from_db: {e}")
            
        print(f"Total loaded face encodings: {len(self.known_face_encodings)}")

    def _process_image(self, image_data: Union[bytes, str]) -> Optional[np.ndarray]:
        """Process image data and convert to RGB numpy array."""
        try:
            if isinstance(image_data, str):
                if image_data.startswith('data:image'):
                    image_data = image_data.split(',', 1)[1]
                if not isinstance(image_data, bytes):
                    image_data = base64.b64decode(image_data)
            
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print("Error: Could not decode image data")
                return None
                
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return None

    def encode_face_from_image(self, image_data: Union[bytes, str, np.ndarray]) -> Optional[np.ndarray]:
        if not self.dlib_available:
            print("WARNING: dlib is not installed. Cannot encode face from image.")
            return None

        try:
            self.load_models()
            
            if isinstance(image_data, np.ndarray):
                rgb_img = image_data
            else:
                rgb_img = self._process_image(image_data)
                
            if rgb_img is None:
                return None
            
            # Detect faces
            dets = self.detector(rgb_img, 1)
            if not dets:
                print("No faces detected in the image")
                return None
                
            # Get the largest face
            det = max(dets, key=lambda det: (det.right() - det.left()) * (det.bottom() - det.top()))
            
            # Get face landmarks and compute encoding
            shape = self.shape_predictor(rgb_img, det)
            face_encoding = np.array(self.face_encoder.compute_face_descriptor(rgb_img, shape), dtype=np.float32)
            
            return face_encoding
        except Exception as e:
            print(f"Error in encode_face_from_image: {str(e)}")
            return None

    def get_face_encoding(self, image_data: Union[bytes, str, np.ndarray]) -> Optional[np.ndarray]:
        """Alias for encode_face_from_image for backward compatibility."""
        return self.encode_face_from_image(image_data)

    def add_face_encoding(self, user_id: str, face_encoding: Union[np.ndarray, list]) -> bool:
        """Add face encoding to temporary storage for training"""
        if face_encoding is not None:
            user_id = str(user_id)
            if hasattr(face_encoding, 'tolist'):
                face_encoding = face_encoding.tolist()
            self.temp_face_encodings[user_id].append(face_encoding)
            print(f"Added face encoding for user {user_id}, total temp: {len(self.temp_face_encodings[user_id])}")
            return True
        return False

    def get_face_encodings_count(self, user_id: str) -> int:
        """Get number of face encodings for a user"""
        return len(self.temp_face_encodings.get(str(user_id), []))

    def save_face_encodings(self, user_id: str) -> Optional[str]:
        """Save face encodings to database format"""
        encodings = self.temp_face_encodings.get(str(user_id), [])
        if encodings:
            self.temp_face_encodings[str(user_id)] = []
            return json.dumps(encodings)
        return None

    def clear_temp_encodings(self, user_id: str) -> None:
        """Clear temporary encodings for a user"""
        user_id = str(user_id)
        if user_id in self.temp_face_encodings:
            self.temp_face_encodings[user_id] = []
            print(f"Cleared temporary encodings for user {user_id}")

    def recognize_face(self, image_data: Union[bytes, str, np.ndarray]) -> Tuple[Optional[str], float]:
        """Recognize face from image data using real dlib models."""
        try:
            # Encode the unknown face
            unknown_encoding = self.encode_face_from_image(image_data)
            if unknown_encoding is None:
                print("No face found in image for recognition")
                return None, 0.0
            
            unknown_encoding = np.array(unknown_encoding, dtype=np.float32)
            
            if len(self.known_face_encodings) == 0:
                print("No known face encodings loaded")
                return None, 0.0
            
            print(f"Loaded {len(self.known_face_encodings)} known encodings")
            
            # Calculate Euclidean distances to all known encodings
            best_match_index = -1
            best_distance = float('inf')
            
            for i, known_encoding in enumerate(self.known_face_encodings):
                known_encoding = np.array(known_encoding, dtype=np.float32)
                distance = np.linalg.norm(unknown_encoding - known_encoding)
                if distance < best_distance:
                    best_distance = distance
                    best_match_index = i
            
            print(f"Best match distance: {best_distance:.4f}, tolerance: {self.tolerance}")
            
            if best_match_index >= 0 and best_distance <= self.tolerance:
                confidence = 1 - (best_distance / self.tolerance)  # Normalize confidence
                user_id = self.known_face_ids[best_match_index]
                print(f"Face recognized: user_id={user_id}, confidence={confidence:.4f}")
                return user_id, confidence
            
            print(f"No matching face found (best distance {best_distance:.4f} > tolerance {self.tolerance})")
            return None, 0.0
        except Exception as e:
            print(f"Error recognizing face: {e}")
            return None, 0.0

    def recognize_multiple_faces(self, image_data: Union[bytes, str, np.ndarray]) -> List[Dict]:
        """Detect and recognize all faces in the image using Dlib ResNet."""
        if not self.dlib_available:
            print("WARNING: dlib is not installed. Cannot recognize multiple faces.")
            return []

        results = []
        try:
            self.load_models()
            
            if isinstance(image_data, np.ndarray):
                rgb_img = image_data
            else:
                rgb_img = self._process_image(image_data)
                
            if rgb_img is None:
                return []
            
            # Detect all faces
            dets = self.detector(rgb_img, 1)
            if not dets:
                print("No faces detected in the image")
                return []
            
            if len(self.known_face_encodings) == 0:
                print("No known face encodings loaded")
                return []
                
            for det in dets:
                shape = self.shape_predictor(rgb_img, det)
                face_encoding = np.array(self.face_encoder.compute_face_descriptor(rgb_img, shape), dtype=np.float32)
                
                # Compare with all known encodings
                best_match_id = None
                best_distance = float('inf')
                
                for i, known_encoding in enumerate(self.known_face_encodings):
                    known_encoding = np.array(known_encoding, dtype=np.float32)
                    distance = np.linalg.norm(face_encoding - known_encoding)
                    if distance < best_distance:
                        best_distance = distance
                        best_match_id = self.known_face_ids[i]
                
                confidence = 0.0
                recognized = False
                if best_match_id and best_distance <= self.tolerance:
                    confidence = 1 - (best_distance / self.tolerance)
                    recognized = True
                
                results.append({
                    'recognized': recognized,
                    'user_id': best_match_id,
                    'confidence': confidence,
                    'distance': float(best_distance),
                    'face_location': (det.top(), det.right(), det.bottom(), det.left())
                })
            
            return results
        except Exception as e:
            print(f"Error in recognize_multiple_faces: {e}")
            return []

# Global face engine instance
face_engine = FaceEngine(tolerance=0.6)
