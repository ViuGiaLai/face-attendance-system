import cv2
import numpy as np
import os
import base64
from app.models import db
from app.models.user import User
from skimage.metrics import structural_similarity as ssim

class FaceRecognizer:
    def __init__(self):
        # Load face detection model
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        # Dictionary to store face encodings (in-memory, consider using a database in production)
        self.face_encodings = {}
        
    def detect_faces(self, image_data):
        try:
            # Chuyển đổi dữ liệu ảnh từ base64 sang numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print("Lỗi: Không thể giải mã ảnh")
                return False, None
                
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Phát hiện khuôn mặt
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            return len(faces) > 0, img
        except Exception as e:
            print(f"Lỗi trong detect_faces: {str(e)}")
            return False, None

    def encode_face(self, image_data, user_id):
        """
        Encode the face and store the encoding
        This is a simplified version - in production, you'd want to use a proper face encoding model
        """
        try:
            # In a real application, you would generate a proper face encoding here
            # For now, we'll just return a simple ID and store the image
            face_id = len(self.face_encodings) + 1
            self.face_encodings[user_id] = face_id
            
            # Save the face image to the database
            if self.register_face(image_data, user_id):
                return face_id
            return None
            
        except Exception as e:
            print(f"Error in encode_face: {str(e)}")
            return None
            
    def register_face(self, image_data, user_id):
        try:
            # Check if user exists
            user = User.query.get(user_id)
            if not user:
                print(f"User {user_id} not found")
                return False

            # Save the face image to the database
            user.face_image = image_data
            db.session.commit()
            print(f"Successfully registered face for user {user_id}")
            return True
            
        except Exception as e:
            print(f"Error in register_face: {str(e)}")
            db.session.rollback()
            return False
            
    def recognize_face(self, image_data, threshold=0.6):
        """
        Recognize a face from the image data
        Returns: (user, confidence) or (None, 0.0) if no match found
        """
        try:
            # Convert image data to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print("Error: Could not decode image")
                return None, 0.0
                
            # Check if there's a face in the image
            has_face, _ = self.detect_faces(image_data)
            if not has_face:
                print("No face detected in the image")
                return None, 0.0
                
            # In a real implementation, you would:
            # 1. Encode the face in the image
            # 2. Compare with stored encodings
            # 3. Return the best match if confidence > threshold
            
            # For now, we'll do a simple check against stored face images
            # This is a placeholder implementation and should be replaced with proper face recognition
            users = User.query.filter(User.face_image.isnot(None)).all()
            
            if not users:
                print("No registered faces found")
                return None, 0.0
                
            # Convert input image to grayscale for comparison
            gray_input = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            best_match = None
            highest_confidence = 0.0
            
            for user in users:
                if not user.face_image:
                    continue
                    
                # Decode stored face image
                try:
                    stored_img = cv2.imdecode(
                        np.frombuffer(user.face_image, np.uint8), 
                        cv2.IMREAD_COLOR
                    )
                    if stored_img is None:
                        continue
                        
                    # Resize images to same dimensions for comparison
                    stored_img = cv2.resize(stored_img, (img.shape[1], img.shape[0]))
                    stored_gray = cv2.cvtColor(stored_img, cv2.COLOR_BGR2GRAY)
                    
                    # Calculate similarity (SSIM) between the two images
                    try:
                        # Resize if dimensions don't match
                        if gray_input.shape != stored_gray.shape:
                            stored_gray = cv2.resize(stored_gray, (gray_input.shape[1], gray_input.shape[0]))
                            
                        score = ssim(gray_input, stored_gray)
                        
                        if score > highest_confidence and score >= threshold:
                            highest_confidence = score
                            best_match = user
                            
                    except Exception as e:
                        print(f"Error comparing images: {str(e)}")
                        continue
                        
                except Exception as e:
                    print(f"Error processing stored image for user {user.id}: {str(e)}")
                    continue
            
            if best_match and highest_confidence >= threshold:
                print(f"Match found: User {best_match.id} with confidence {highest_confidence}")
                return best_match, highest_confidence
                
            print(f"No match found. Best confidence: {highest_confidence}")
            return None, highest_confidence
            
        except Exception as e:
            print(f"Error in recognize_face: {str(e)}")
            import traceback
            traceback.print_exc()
            return None, 0.0

# Initialize a global instance
face_recognizer = FaceRecognizer()