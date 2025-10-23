import dlib
import numpy as np
import json
import cv2
from PIL import Image
import io
import base64
import os
from typing import Optional, Tuple, Dict, List, Union
from dataclasses import dataclass

@dataclass
class FaceRecognitionResult:
    """A class to hold face recognition results."""
    user_id: Optional[str]
    confidence: float
    face_location: Optional[Tuple[int, int, int, int]] = None  # top, right, bottom, left

current_dir = os.path.dirname(os.path.abspath(__file__))

class FaceEngine:
    def __init__(self):
        """Initialize the face recognition engine."""
        # Initialize detector lazily to avoid memory issues
        self.detector = None
        self.shape_predictor = None
        self.face_encoder = None
        # Store multiple encodings per user: {user_id: [encoding1, encoding2, ...]}
        self.known_face_encodings: Dict[str, List[np.ndarray]] = {}
        self.known_face_ids: List[str] = []
        self._models_loaded = False

    def load_models(self) -> None:
        """Load required models with error handling.

        Raises:
            FileNotFoundError: If model files are missing
            RuntimeError: If models fail to load
        """
        if self._models_loaded:
            return

        try:
            # Initialize detector if not already done
            if self.detector is None:
                self.detector = dlib.get_frontal_face_detector()

            # Load shape predictor
            predictor_path = os.path.join(current_dir, 'shape_predictor_68_face_landmarks.dat')
            if not os.path.exists(predictor_path):
                raise FileNotFoundError(f"Shape predictor model not found at: {predictor_path}")

            self.shape_predictor = dlib.shape_predictor(predictor_path)

            # Load face recognition model
            model_path = os.path.join(current_dir, 'dlib_face_recognition_resnet_model_v1.dat')
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Face recognition model not found at: {model_path}")

            self.face_encoder = dlib.face_recognition_model_v1(model_path)
            self._models_loaded = True

        except Exception as e:
            self.shape_predictor = None
            self.face_encoder = None
            self._models_loaded = False
            raise RuntimeError(f"Failed to load models: {str(e)}")

    def load_face_encodings_from_db(self, users):
        """Load face encodings from user database"""
        self.known_face_encodings = []
        self.known_face_ids = []
        
        for user in users:
            if user.face_encodings and user.is_active:  # Sửa thành face_encodings
                try:
                    encodings_list = json.loads(user.face_encodings)  # Sửa thành face_encodings
                    for encoding in encodings_list:
                        self.known_face_encodings.append(np.array(encoding))
                        self.known_face_ids.append(user.id)
                    print(f"Loaded {len(encodings_list)} face encodings for user {user.name}")
                except Exception as e:
                    print(f"Error loading face encodings for user {user.id}: {e}")
        
        print(f"Total loaded face encodings: {len(self.known_face_encodings)}")
    def _process_image(self, image_data: Union[bytes, str]) -> Optional[np.ndarray]:
        """Process image data and convert to RGB numpy array."""
        try:
            # Handle different input types
            if isinstance(image_data, str):
                if image_data.startswith('data:image'):
                    # Extract base64 data from data URL
                    image_data = image_data.split(',', 1)[1]
                # Decode base64 if needed
                if not isinstance(image_data, bytes):
                    image_data = base64.b64decode(image_data)
            
            # Convert to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print("Error: Could not decode image data")
                return None
                
            # Convert to RGB (dlib uses RGB)
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return None

    def get_face_encoding(self, image_data: Union[bytes, str, np.ndarray]) -> Optional[bytes]:
        """Extract face encoding from an image.
        
        Args:
            image_data: Can be file path, base64 string, bytes, or numpy array
            
        Returns:
            Optional[bytes]: Serialized face encoding or None if no face found
        """
        try:
            self.load_models()
            
            # Process the image
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
            face_encoding = np.array(self.face_encoder.compute_face_descriptor(rgb_img, shape))
            
            return face_encoding.tobytes()
            
        except Exception as e:
            print(f"Error in get_face_encoding: {str(e)}")
            return None

    def encode_face_from_image(self, image_data: Union[bytes, str, np.ndarray]) -> Optional[bytes]:
        """Alias for get_face_encoding for backward compatibility."""
        return self.get_face_encoding(image_data)

    def recognize_face(
        self, 
        image_data: Union[bytes, str, np.ndarray], 
        tolerance: float = 0.6,
        require_eyes: bool = True
    ) -> FaceRecognitionResult:
        """Recognize a face in the given image.
        
        Args:
            image_data: Input image (file path, base64, bytes, or numpy array)
            tolerance: Distance tolerance for face matching (lower is more strict)
            require_eyes: If True, only match if eyes are detected and open
            
        Returns:
            FaceRecognitionResult: Contains user_id, confidence, and face location
        """
        try:
            # Get face encoding from the image
            face_encoding = self.get_face_encoding(image_data)
            if face_encoding is None:
                return FaceRecognitionResult(None, 0.0)
                
            face_encoding_np = np.frombuffer(face_encoding, dtype=np.float64)
            
            if not self.known_face_encodings:
                print("No known face encodings loaded")
                return FaceRecognitionResult(None, 0.0)

            best_match_id = None
            best_confidence = 0.0
            best_distance = float('inf')

            for user_id, encodings in self.known_face_encodings.items():
                if not encodings:
                    continue
                    
                # Calculate distances to all encodings for this user
                distances = []
                for enc in encodings:
                    if isinstance(enc, list):
                        enc = np.array(enc, dtype=np.float64)
                    elif isinstance(enc, bytes):
                        enc = np.frombuffer(enc, dtype=np.float64)
                    
                    # Calculate Euclidean distance between encodings
                    distance = np.linalg.norm(face_encoding_np - enc)
                    distances.append(distance)
                
                # Use the best match for this user
                if distances:
                    min_distance = min(distances)
                    confidence = max(0.0, 1.0 - min_distance)
                    
                    # Update best match if this is better
                    if confidence > best_confidence and confidence > (1.0 - tolerance):
                        best_confidence = confidence
                        best_match_id = user_id
                        best_distance = min_distance

            # Create result object
            result = FaceRecognitionResult(
                user_id=best_match_id,
                confidence=best_confidence,
                face_encoding=face_encoding_np
            )
            
            # Add debug info
            if best_match_id:
                print(f"Matched user {best_match_id} with confidence {best_confidence:.2f} (distance: {best_distance:.4f})")
            
            return result

        except Exception as e:
            print(f"Error in recognize_face: {str(e)}")
            return FaceRecognitionResult(None, 0.0)

    def add_face_encoding(self, user_id: str, face_encoding: Union[bytes, np.ndarray, list]) -> bool:
        """Add a new face encoding for a user.
        
        Args:
            user_id: ID of the user
            face_encoding: Face encoding as bytes, numpy array, or list
            
        Returns:
            bool: True if added successfully, False otherwise
        """
        if face_encoding is None:
            return False
            
        try:
            user_id = str(user_id)  # Ensure consistent string IDs
            
            if user_id not in self.known_face_encodings:
                self.known_face_encodings[user_id] = []
                if user_id not in self.known_face_ids:
                    self.known_face_ids.append(user_id)
            
            # Convert to numpy array if needed
            if isinstance(face_encoding, bytes):
                face_encoding = np.frombuffer(face_encoding, dtype=np.float64)
            elif isinstance(face_encoding, list):
                face_encoding = np.array(face_encoding, dtype=np.float64)
            
            # Store as list for JSON serialization
            self.known_face_encodings[user_id].append(face_encoding.tolist())
            return True
            
        except Exception as e:
            print(f"Error adding face encoding: {str(e)}")
            return False
        
    def get_face_encodings(self, user_id: str) -> List[np.ndarray]:
        """Get all face encodings for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            list: List of face encodings as numpy arrays
        """
        return [np.array(enc) for enc in self.known_face_encodings.get(str(user_id), [])]
        
    def get_face_encodings_count(self, user_id: str) -> int:
        """Get number of face encodings for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            int: Number of face encodings
        """
        return len(self.known_face_encodings.get(str(user_id), []))
        
    def save_face_encodings(self, user_id: str) -> Optional[str]:
        """Save all face encodings for a user to a JSON string.
        
        Args:
            user_id: ID of the user
            
        Returns:
            str: JSON string of face encodings or None if no encodings
        """
        user_id = str(user_id)
        if user_id in self.known_face_encodings and self.known_face_encodings[user_id]:
            return json.dumps(self.known_face_encodings[user_id])
        return None


# Global instance
face_engine = FaceEngine()
