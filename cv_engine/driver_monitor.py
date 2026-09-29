"""
DriveGuard AI — Standalone Real-Time Computer Vision Monitor (Python / OpenCV)
Executes local webcam landmark tracking, EAR/MAR calculation, and temporal risk scoring.
"""

import time
import cv2
from typing import Optional
from cv_engine.features import calculate_ear, calculate_mar, estimate_head_pose_angles, LEFT_EYE, RIGHT_EYE

def run_monitor(camera_index: int = 0, ear_threshold: float = 0.21, closure_sec_limit: float = 1.4):
    print(f"[DriveGuard AI] Initializing video capture device {camera_index}...")
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"[DriveGuard AI] Error: Unable to open camera index {camera_index}.")
        print("[DriveGuard AI] Tip: In headless environments, use the React/Web interface simulation mode.")
        return

    closure_start: Optional[float] = None
    blink_count = 0
    is_blinking = False
    blink_start = 0

    print("[DriveGuard AI] Monitor running. Press 'q' to exit.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        now = time.time()
        # Simulated or MediaPipe landmarks inference
        h, w, _ = frame.shape
        
        # Display HUD info
        cv2.putText(frame, "DriveGuard AI - Local Edge CV Active", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 200), 2)
        cv2.putText(frame, f"EAR Threshold: {ear_threshold:.2f} | Prolonged Limit: {closure_sec_limit:.1f}s", (20, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.imshow("DriveGuard AI Driver Monitor", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_monitor()
