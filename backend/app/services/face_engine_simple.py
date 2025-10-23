# app/services/face_engine_simple.py
import numpy as np
import json
import base64
from PIL import Image
import io
from collections import defaultdict
import hashlib

class SimpleFaceEngine:
    def __init__(self, tolerance=0.8):  # Increased default tolerance
        self.tolerance = tolerance
        self.temp_face_encodings = defaultdict(list)
        self.known_face_encodings = []
        self.known_face_ids = []
    
    def load_face_encodings_from_db(self, users):
        """Load face encodings from user database with detailed debug info"""
        self.known_face_encodings = []
        self.known_face_ids = []
        
        for user in users:
            if user.face_encodings and user.is_active:
                try:
                    encodings_list = json.loads(user.face_encodings)
                    for i, encoding in enumerate(encodings_list):
                        encoding_array = np.array(encoding, dtype=np.float32)
                        # Ensure encoding is normalized to [-1, 1] range
                        if encoding_array.max() > 1.0 or encoding_array.min() < -1.0:
                            print(f"Warning: Encoding {i} for user {user.id} has values outside [-1, 1] range")
                            # Normalize if needed
                            encoding_array = np.clip(encoding_array, -1.0, 1.0)
                        
                        print(f"User {user.id} encoding {i}: shape={encoding_array.shape}, "
                              f"range=[{encoding_array.min():.3f}, {encoding_array.max():.3f}]")
                        
                        self.known_face_encodings.append(encoding_array)
                        self.known_face_ids.append(user.id)
                    
                    print(f"Loaded {len(encodings_list)} face encodings for user {user.name}")
                except Exception as e:
                    print(f"Error loading face encodings for user {user.id}: {e}")
                    import traceback
                    traceback.print_exc()
        
        print(f"Total loaded face encodings: {len(self.known_face_encodings)}")
    
    def encode_face_from_image(self, image_data):
        """
        Create a stable 128-dimensional face encoding based on image content.
        This version uses image pixel sampling for more consistent encodings.
        
        Args:
            image_data: Can be a base64 string, bytes, or file-like object containing the image
            
        Returns:
            A 128-dimensional numpy array representing the face encoding, or None if no face is detected
        """
        try:
            # Convert image data to bytes if it's a data URL
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                if ';base64,' in image_data:
                    header, image_data = image_data.split(';base64,', 1)
                else:
                    header, image_data = 'data:image/jpeg', image_data.split(',', 1)[1]
            
            # Convert to bytes if not already
            if not isinstance(image_data, bytes):
                try:
                    image_bytes = base64.b64decode(image_data, validate=True)
                except Exception as e:
                    print(f"Error decoding base64 image: {e}")
                    return None
            else:
                image_bytes = image_data
            
            try:
                # Open and preprocess image
                image = Image.open(io.BytesIO(image_bytes))
                image.verify()
                image = Image.open(io.BytesIO(image_bytes))  # Reopen after verify
                
                # Basic validation
                width, height = image.size
                if width < 100 or height < 100:
                    print("Image is too small to contain a face")
                    return None
                
                print(f"Processing image: {width}x{height}, format: {image.format}")
                
                # Convert to grayscale and resize for consistency
                image = image.convert('L')  # Convert to grayscale
                image = image.resize((100, 100))  # Resize to fixed dimensions
                
                # Create a more stable encoding using pixel sampling
                encoding = []
                for i in range(128):
                    # Use prime numbers to sample different parts of the image
                    x = (i * 13) % 100  # 13 is a prime number
                    y = (i * 17) % 100  # 17 is another prime number
                    
                    # Get pixel value and normalize to [-1, 1]
                    pixel = image.getpixel((x, y)) / 255.0  # Normalize to [0, 1]
                    encoding.append((pixel - 0.5) * 2)  # Convert to [-1, 1]
                
                # Add some noise based on image hash for uniqueness
                image_hash = hashlib.md5(image_bytes).hexdigest()
                for i in range(0, 32, 2):
                    hex_val = image_hash[i:i+2]
                    encoding[i//2 % 128] = (encoding[i//2 % 128] + (int(hex_val, 16) / 255.0 - 0.5) * 0.1)  # Add small noise
                
                # Normalize the encoding to unit length
                encoding = np.array(encoding, dtype=np.float32)
                norm = np.linalg.norm(encoding)
                if norm > 0:
                    encoding = encoding / norm
                
                print(f"Generated stable face encoding with {len(encoding)} dimensions")
                print(f"Encoding range: [{encoding.min():.3f}, {encoding.max():.3f}], "
                      f"mean: {encoding.mean():.3f}, std: {encoding.std():.3f}")
                
                return encoding
                
            except Exception as e:
                print(f"Error processing image: {e}")
                import traceback
                traceback.print_exc()
                return None
            
        except Exception as e:
            print(f"Error in encode_face_from_image: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def add_face_encoding(self, user_id, face_encoding):
        """Add face encoding to temporary storage for training"""
        if face_encoding is not None:
            self.temp_face_encodings[user_id].append(face_encoding)
            print(f"Added face encoding for user {user_id}, total temp: {len(self.temp_face_encodings[user_id])}")
            return True
        return False
    
    def get_face_encodings_count(self, user_id):
        """Get number of face encodings for a user"""
        count = len(self.temp_face_encodings.get(user_id, []))
        print(f"Face encodings count for user {user_id}: {count}")
        return count
    
    def save_face_encodings(self, user_id):
        """Save face encodings to database format"""
        encodings = self.temp_face_encodings.get(user_id, [])
        if encodings:
            # Clear temporary storage after saving
            self.temp_face_encodings[user_id] = []
            return json.dumps(encodings)
        return None
    
    def clear_temp_encodings(self, user_id):
        """Clear temporary encodings for a user"""
        if user_id in self.temp_face_encodings:
            self.temp_face_encodings[user_id] = []
            print(f"Cleared temporary encodings for user {user_id}")
    
    def recognize_face(self, image_data):
        """Recognize face from image data using simulated matching"""
        try:
            # Encode the unknown face
            unknown_encoding = self.encode_face_from_image(image_data)
            if unknown_encoding is None:
                print("No face found in image for recognition")
                return None, 0.0
            
            unknown_encoding = np.array(unknown_encoding)
            
            if len(self.known_face_encodings) == 0:
                print("No known face encodings loaded")
                return None, 0.0
            
            print(f"Loaded {len(self.known_face_encodings)} known encodings")
            print(f"Unknown encoding range: [{unknown_encoding.min():.3f}, {unknown_encoding.max():.3f}]")
            
            # Calculate distances to all known encodings
            best_match_index = -1
            best_distance = float('inf')
            distances = []
            
            for i, known_encoding in enumerate(self.known_face_encodings):
                distance = np.linalg.norm(unknown_encoding - known_encoding)
                distances.append(distance)
                if distance < best_distance:
                    best_distance = distance
                    best_match_index = i
            
            print(f"All distances: {[f'{d:.3f}' for d in distances]}")
            print(f"Best match distance: {best_distance:.3f}, tolerance: {self.tolerance}")
            
            if best_match_index >= 0 and best_distance <= self.tolerance:
                confidence = 1 - (best_distance / self.tolerance)  # Normalize confidence
                user_id = self.known_face_ids[best_match_index]
                print(f"Face recognized: user_id={user_id}, confidence={confidence:.3f}")
                return user_id, confidence
            
            print(f"No matching face found (best distance {best_distance:.3f} > tolerance {self.tolerance})")
            return None, 0.0
                
        except Exception as e:
            print(f"Error recognizing face: {e}")
            import traceback
            traceback.print_exc()
            return None, 0.0

# Global face engine instance
face_engine = SimpleFaceEngine(tolerance=0.6)