import numpy as np
import cv2
import math
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# 1. AI Categorization & Priority Training Data
CIVIC_TRAINING_CORPUS = [
    # Roads & Potholes
    ("Huge pothole in the middle of the road causing cars to swerve.", "Roads & Potholes"),
    ("Road cracked and broken after heavy rains, dangerous for bikes.", "Roads & Potholes"),
    ("Main road has several deep potholes that damaged my car wheel.", "Roads & Potholes"),
    ("The street surface is completely eroded and needs resurfacing.", "Roads & Potholes"),
    # Garbage Management
    ("Garbage is piling up on the street corner and smells terrible.", "Garbage Management"),
    ("Trash collection bin is overflowing and attracting dogs/flies.", "Garbage Management"),
    ("Debris and litter scattered all over the municipal park.", "Garbage Management"),
    ("Public garbage dump has not been cleared for three days.", "Garbage Management"),
    # Water Supply Issues
    ("No water supply in our apartment complex since yesterday morning.", "Water Supply Issues"),
    ("Drinking water coming out of the tap is muddy and smells bad.", "Water Supply Issues"),
    ("Major pipeline burst on the sidewalk, water is spraying everywhere.", "Water Supply Issues"),
    ("Very low water pressure in our taps, cannot perform daily tasks.", "Water Supply Issues"),
    # Drainage & Sewage
    ("Open drainage line is blocked and black water is spilling onto the street.", "Drainage Problems"),
    ("Stormwater drain clogged with plastic bags, causing street flooding.", "Drainage Problems"),
    ("Sewage pipe blocked, dirty water backing up into household toilets.", "Sewage Issues"),
    ("Foul smelling sewer line leaking onto the main walking path.", "Sewage Issues"),
    # Streetlight Failure
    ("All street lights on Sector 4 road are not working, extremely dark.", "Streetlight Failure"),
    ("Streetlight outside my gate has been flickering constantly.", "Streetlight Failure"),
    ("Dark streets at night making it unsafe for women and seniors.", "Streetlight Failure"),
    ("Bulb in the lamp post is burnt out and needs replacement.", "Streetlight Failure"),
    # Electricity Problems
    ("Frequent power cuts and high voltage fluctuations damaging appliances.", "Electricity Problems"),
    ("Live electrical wire hanging dangerously low from the transformer.", "Electricity Problems"),
    ("Electricity transformer exploded and caught fire, no power.", "Electricity Problems"),
    # Public Property Damage
    ("The benches in the public park are broken and vandalized.", "Public Property Damage"),
    ("Metal railings on the pedestrian bridge have been bent and damaged.", "Public Property Damage"),
    # Traffic Signal Issues
    ("Traffic lights at the crossroads are dead, causing massive gridlocks.", "Traffic Signal Issues"),
    ("Pedestrian crossing signal is stuck on red and not changing.", "Traffic Signal Issues"),
    # Environmental Issues
    ("Factories dumping chemical waste into the local stream.", "Environmental Issues"),
    ("Illegal cutting down of trees in the forest reserve area.", "Environmental Issues"),
    ("Extreme dust pollution from the construction site without nets.", "Environmental Issues")
]

class AIService:
    def __init__(self):
        # Prepare text classification models
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.classifier = MultinomialNB()
        
        # Extract features and labels
        texts = [item[0] for item in CIVIC_TRAINING_CORPUS]
        labels = [item[1] for item in CIVIC_TRAINING_CORPUS]
        
        # Fit models
        X_train = self.vectorizer.fit_transform(texts)
        self.classifier.fit(X_train, labels)
        
    def classify_complaint(self, description):
        """Predicts the category of a complaint description."""
        if not description or len(description.strip()) < 5:
            return "Others"
        
        # Predict using Naive Bayes
        try:
            X_test = self.vectorizer.transform([description])
            prediction = self.classifier.predict(X_test)[0]
            
            # Additional heuristic check to refine simple ML predictions
            desc_lower = description.lower()
            if "pothole" in desc_lower or "road" in desc_lower or "tar" in desc_lower:
                return "Roads & Potholes"
            elif "garbage" in desc_lower or "trash" in desc_lower or "waste" in desc_lower or "bin" in desc_lower:
                return "Garbage Management"
            elif "water" in desc_lower or "tap" in desc_lower or "leak" in desc_lower or "pipeline" in desc_lower:
                if "sewer" in desc_lower or "sewage" in desc_lower:
                    return "Sewage Issues"
                return "Water Supply Issues"
            elif "drain" in desc_lower or "clog" in desc_lower or "flooding" in desc_lower:
                return "Drainage Problems"
            elif "sewage" in desc_lower or "sewer" in desc_lower or "smell" in desc_lower:
                return "Sewage Issues"
            elif "light" in desc_lower or "bulb" in desc_lower or "lamp" in desc_lower or "dark" in desc_lower:
                return "Streetlight Failure"
            elif "power" in desc_lower or "electricity" in desc_lower or "wire" in desc_lower or "transformer" in desc_lower:
                return "Electricity Problems"
            elif "park" in desc_lower or "bench" in desc_lower or "public property" in desc_lower:
                return "Public Property Damage"
            elif "traffic" in desc_lower or "signal" in desc_lower or "crossroads" in desc_lower:
                return "Traffic Signal Issues"
            elif "pollution" in desc_lower or "tree" in desc_lower or "chemical" in desc_lower:
                return "Environmental Issues"
                
            return prediction
        except Exception:
            return "Others"

    def predict_priority(self, description):
        """Predicts priority level (Critical, High, Medium, Low) based on description urgency."""
        if not description:
            return "Medium"
        
        desc_lower = description.lower()
        
        # High emergency keywords
        critical_keywords = [
            "danger", "hazard", "accident", "injury", "live wire", "hanging wire", 
            "transformer fire", "exploded", "flooding inside", "burst pipeline", 
            "blocked toilet", "choked sewer", "gas leak"
        ]
        high_keywords = [
            "broken leg", "fell down", "swerved", "collision", "flickering", 
            "no water", "power outage", "overflowing", "smell", "darkness", "safety"
        ]
        
        for keyword in critical_keywords:
            if keyword in desc_lower:
                return "Critical"
                
        for keyword in high_keywords:
            if keyword in desc_lower:
                return "High"
                
        if len(description) > 150:
            return "Medium"
            
        return "Low"

    def detect_duplicates(self, new_lat, new_lng, new_desc, existing_complaints):
        """
        Scans existing complaints to check if there is a similar issue in the near vicinity.
        Returns (is_duplicate, duplicate_complaint_id)
        """
        if not existing_complaints:
            return False, None
            
        def calculate_distance(lat1, lon1, lat2, lon2):
            # Haversine formula
            R = 6371000 # Earth radius in meters
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            
            a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c

        # Compute TF-IDF for cosine similarity checks
        try:
            # We fit the vectorizer on the input texts
            all_texts = [comp['description'] for comp in existing_complaints] + [new_desc]
            tfidf = TfidfVectorizer().fit_transform(all_texts)
            vectors = tfidf.toarray()
            new_vector = vectors[-1]
        except Exception:
            vectors = None
            
        for idx, comp in enumerate(existing_complaints):
            # Compute distance in meters
            dist = calculate_distance(new_lat, new_lng, comp['latitude'], comp['longitude'])
            
            # If coordinates are within 100 meters
            if dist < 100:
                # If vectors computed, check cosine similarity
                if vectors is not None:
                    comp_vector = vectors[idx]
                    dot_product = np.dot(new_vector, comp_vector)
                    norm_new = np.linalg.norm(new_vector)
                    norm_comp = np.linalg.norm(comp_vector)
                    similarity = dot_product / (norm_new * norm_comp) if (norm_new * norm_comp) > 0 else 0
                else:
                    # Fallback word intersection check
                    words1 = set(new_desc.lower().split())
                    words2 = set(comp['description'].lower().split())
                    similarity = len(words1.intersection(words2)) / max(len(words1), len(words2), 1)
                
                # If spatial distance is short and text matches highly, flag duplicate
                if similarity > 0.50:
                    return True, comp['unique_id']
                    
        return False, None

    def analyze_image(self, image_path):
        """
        Uses OpenCV to perform edge and texture analysis on uploaded files.
        Detects structural patterns (potholes) or messy color heaps (garbage).
        """
        if not os.path.exists(image_path):
            return {
                "detected": False,
                "confidence": 0.0,
                "details": "Image not found",
                "features": {}
            }
            
        try:
            # Read image in grayscale
            img = cv2.imread(image_path)
            if img is None:
                return {
                    "detected": False,
                    "confidence": 0.0,
                    "details": "Could not decode image files",
                    "features": {}
                }
                
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            
            # Apply edge detection (Canny) to check for rough/jagged contours
            edges = cv2.Canny(gray, 50, 150)
            edge_ratio = np.sum(edges > 0) / (h * w)
            
            # Calculate texture variance using Laplacian (checks for surface roughness)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Color histogram variance (checks for random color garbage heap structures)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            h_hist = cv2.calcHist([hsv], [0], None, [16], [0, 180])
            color_variance = float(np.var(h_hist))
            
            # High edge ratio + high surface texture variance usually indicators of trash/potholes
            detected = False
            confidence = 0.5
            detected_tags = []
            
            if laplacian_var > 150:
                detected_tags.append("Rough texture detected (indicates potholes or debris)")
                confidence += 0.15
                
            if edge_ratio > 0.05:
                detected_tags.append("High count of irregular boundaries (cracks or garbage heaps)")
                confidence += 0.20
                
            if color_variance > 5000:
                detected_tags.append("Diverse color patterns (indicates litter/refuse)")
                confidence += 0.10
                
            # Cap confidence at 0.95
            confidence = min(confidence, 0.95)
            if confidence > 0.65:
                detected = True
                
            return {
                "detected": detected,
                "confidence": round(confidence, 2),
                "details": ", ".join(detected_tags) if detected_tags else "Normal surface properties",
                "features": {
                    "edge_density": round(float(edge_ratio), 4),
                    "surface_variance": round(float(laplacian_var), 2),
                    "color_diversity": round(color_variance, 2)
                }
            }
        except Exception as e:
            return {
                "detected": False,
                "confidence": 0.0,
                "details": f"Error running image analysis: {str(e)}",
                "features": {}
            }

    def chatbot_reply(self, message, complaint_db_helper=None):
        """
        Interactive FAQ and complaint tracking assistant chatbot.
        """
        if not message:
            return "Hello! I am the Civic AI Assistant. How can I help you today?"
            
        msg = message.lower()
        
        # 1. Check if user is asking to track a complaint
        import re
        complaint_match = re.search(r'(cc-\d{8}-\w+)', msg)
        if complaint_match:
            unique_id = complaint_match.group(1).upper()
            if complaint_db_helper:
                complaint_data = complaint_db_helper(unique_id)
                if complaint_data:
                    return f"📋 **Complaint {unique_id} Found!**\n" \
                           f"• **Category**: {complaint_data.category}\n" \
                           f"• **Status**: {complaint_data.status}\n" \
                           f"• **Priority**: {complaint_data.priority}\n" \
                           f"• **Remarks**: {complaint_data.remarks or 'No remarks yet'}\n" \
                           f"• **Last Updated**: {complaint_data.updated_at.strftime('%Y-%m-%d %H:%M')}"
                else:
                    return f"I couldn't find a complaint with ID **{unique_id}** in our database. Please double-check the ID."
            else:
                return f"Tracking ID **{unique_id}**. (Database lookup disabled in current context)."
                
        # 2. Check FAQ matching
        if "pothole" in msg or "road" in msg:
            return "🕳️ **Reporting Road Issues**: Select 'Roads & Potholes' during report submission. Our AI will automatically verify the damage from your uploaded photo, tag the location, and direct it to the Roads and PWD Department immediately."
            
        elif "garbage" in msg or "trash" in msg or "smell" in msg:
            return "🗑️ **Reporting Garbage**: Tag 'Garbage Management'. If you upload an image, our AI detects trash pile outlines and flags the sanitation trucks. Cleanups are typically scheduled within 24 hours."
            
        elif "water" in msg or "leak" in msg or "pipe" in msg:
            return "💧 **Reporting Water Supply Issues**: Pipeline bursts, dirty drinking water, or low pressure should be reported under 'Water Supply Issues'. These are routed directly to the Water Department's engineers."
            
        elif "light" in msg or "dark" in msg or "street lamp" in msg:
            return "💡 **Reporting Streetlight Failures**: Enter the address or pin the lamp post location. Streetlight issues are sent to the Electricity Department for bulb/wiring replacement."
            
        elif "status" in msg or "track" in msg:
            return "🔍 To track a complaint, please paste your unique **Complaint ID** (e.g. *CC-20260625-XXXX*) directly into this chat, or visit the 'My Complaints' section on your Dashboard."
            
        elif "hello" in msg or "hi" in msg or "hey" in msg:
            return "👋 Hello! I am your Smart Civic Assistant. You can ask me questions about civic issues, request information on department responsibilities, or paste a Complaint ID to get real-time tracking updates."
            
        elif "how to report" in msg or "how do i submit" in msg:
            return "📝 **To submit a complaint**:\n1. Click on the **Submit Complaint** button on your dashboard.\n2. Enter a description and optional pictures.\n3. The system will auto-fill the category and GPS location.\n4. Click submit to receive your Unique Tracking ID."
            
        else:
            return "I am here to assist with civic complaints. You can ask about:\n" \
                   "• How to report potholes, garbage, or water leaks.\n" \
                   "• Tracking your complaint (simply enter your Complaint ID).\n" \
                   "• Finding department details."
