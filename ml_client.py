import time
import random
import requests
import json
from datetime import datetime

# Simple dummy ML Client that simulates telemetry ingestion and ATSADBench evaluation submission.
# This script interacts with the ORBITA backend via its REST API.

BASE_URL = "http://localhost:8000/api/v1"

def simulate_evaluate_run(run_id=1, sequence_length=100):
    print(f"[*] Simulating ML anomaly detection evaluation for Run ID {run_id}...")
    
    # Simulating y_true (ground truth: 5% anomalies)
    y_true = [1 if random.random() < 0.05 else 0 for _ in range(sequence_length)]
    
    # Simulating y_pred (predictive model, with some accuracy)
    y_pred = []
    for actual in y_true:
        if actual == 1:
            # 85% chance to catch the anomaly
            y_pred.append(1 if random.random() < 0.85 else 0)
        else:
            # 5% false positive rate
            y_pred.append(1 if random.random() < 0.05 else 0)
            
    payload = {
        "run_id": run_id,
        "y_true": y_true,
        "y_pred": y_pred,
        "composite_weights": {
            "f1_score": 0.3,
            "alarm_accuracy": 0.3,
            "alarm_latency": 0.2,
            "alarm_contiguity": 0.2
        },
        "save_detections": True
    }
    
    print("[*] Submitting predictions to ORBITA-ATSAD evaluate endpoint...")
    try:
        response = requests.post(f"{BASE_URL}/atsad/evaluate", json=payload)
        response.raise_for_status()
        data = response.json()
        print("[+] Evaluation Results Submitted Successfully!")
        print(json.dumps(data, indent=2))
    except requests.exceptions.RequestException as e:
        print(f"[-] Error connecting to backend: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(e.response.text)

if __name__ == "__main__":
    print("[*] Starting Live ML Model Client for ORBITA ATSAD Benchmark")
    print("----------------------------------------------------------------")
    # Note: run_id needs to correspond to an existing run in the ORBITA backend!
    # For a real system, you'd fetch the active run_id dynamically or pass it as an arg.
    simulate_evaluate_run(run_id=1, sequence_length=200)
    print("----------------------------------------------------------------")
    print("[*] Done")
