"""
DriveGuard AI — Computer Vision Feature Extraction (Python / MediaPipe / OpenCV)
"""

import math
from typing import List, Tuple, Dict, Any

# MediaPipe canonical 468 landmarks indices
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
LIPS_VERTICAL = [13, 14]
LIPS_HORIZONTAL = [78, 308]
NOSE_TIP = 1
CHIN = 152
FOREHEAD = 10

def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

def calculate_ear(landmarks: List[Tuple[float, float]], eye_indices: List[int]) -> float:
    """
    Computes Eye Aspect Ratio (EAR) using Soukupová and Čech formulation:
    EAR = (||p2 - p6|| + ||p3 - p5||) / (2.0 * ||p1 - p4||)
    """
    p1 = landmarks[eye_indices[0]]
    p2 = landmarks[eye_indices[1]]
    p3 = landmarks[eye_indices[2]]
    p4 = landmarks[eye_indices[3]]
    p5 = landmarks[eye_indices[4]]
    p6 = landmarks[eye_indices[5]]

    v1 = euclidean_distance(p2, p6)
    v2 = euclidean_distance(p3, p5)
    h = euclidean_distance(p1, p4)

    if h < 1e-6:
        return 0.3
    return (v1 + v2) / (2.0 * h)

def calculate_mar(landmarks: List[Tuple[float, float]]) -> float:
    """
    Computes Mouth Aspect Ratio (MAR):
    MAR = ||lip_top - lip_bottom|| / ||lip_left - lip_right||
    """
    top = landmarks[LIPS_VERTICAL[0]]
    bottom = landmarks[LIPS_VERTICAL[1]]
    left = landmarks[LIPS_HORIZONTAL[0]]
    right = landmarks[LIPS_HORIZONTAL[1]]

    vertical = euclidean_distance(top, bottom)
    horizontal = euclidean_distance(left, right)

    if horizontal < 1e-6:
        return 0.1
    return vertical / horizontal

def estimate_head_pose_angles(landmarks: List[Tuple[float, float]]) -> Dict[str, float]:
    """
    Estimates Euler orientation angles (Pitch, Yaw, Roll) in degrees
    from facial landmark geometry.
    """
    nose = landmarks[NOSE_TIP]
    chin = landmarks[CHIN]
    forehead = landmarks[FOREHEAD]
    left_eye = landmarks[LEFT_EYE[0]]
    right_eye = landmarks[RIGHT_EYE[3]]

    # Yaw
    eye_mid_x = (left_eye[0] + right_eye[0]) / 2.0
    eye_dist = euclidean_distance(left_eye, right_eye)
    yaw_ratio = (nose[0] - eye_mid_x) / eye_dist if eye_dist > 1e-6 else 0.0
    yaw_deg = max(-60.0, min(60.0, yaw_ratio * 110.0))

    # Pitch
    face_height = euclidean_distance(forehead, chin)
    eye_mid_y = (left_eye[1] + right_eye[1]) / 2.0
    rel_y = (nose[1] - eye_mid_y) / face_height if face_height > 1e-6 else 0.37
    pitch_deg = max(-45.0, min(45.0, (0.37 - rel_y) * 120.0))

    # Roll
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    roll_deg = math.degrees(math.atan2(dy, dx))

    return {
        "pitch": round(pitch_deg, 1),
        "yaw": round(yaw_deg, 1),
        "roll": round(roll_deg, 1)
    }
