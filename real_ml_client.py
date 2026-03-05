import time
import requests
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

import torch
import torch.nn as nn
import torch.optim as optim

BASE_URL = "http://localhost:8000/api/v1"

# Define the PyTorch LSTM Autoencoder model
class LSTMAutoencoder(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_layers=1):
        super(LSTMAutoencoder, self).__init__()
        self.encoder = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.decoder = nn.LSTM(hidden_dim, input_dim, num_layers, batch_first=True)
    
    def forward(self, x):
        _, (hidden, _) = self.encoder(x)
        # Repeat the last hidden state for the sequence length
        hidden = hidden[-1].unsqueeze(1).repeat(1, x.size(1), 1)
        out, _ = self.decoder(hidden)
        return out

class TelemetryAnomalyDetectorLSTM:
    def __init__(self, object_id, subsystem):
        self.object_id = object_id
        self.subsystem = subsystem
        
        self.input_dim = 3 # voltage, current, temperature
        self.hidden_dim = 16
        self.seq_len = 10
        self.model = LSTMAutoencoder(self.input_dim, self.hidden_dim)
        self.criterion = nn.MSELoss()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.01)
        
        self.is_trained = False
        self.threshold = 0.0
        
        # Buffer for live inference (needs sequence of `self.seq_len`)
        self.live_buffer = []

    def generate_synthetic_telemetry(self, is_anomalous=False):
        """Generates realistic telemetry points, with optional injected faults."""
        voltage = np.random.normal(28.0, 0.2)
        current = np.random.normal(5.0, 0.5)
        temperature = np.random.normal(15.0, 1.0)
        
        if is_anomalous:
            fault_type = random.choice(['voltage_spike', 'current_drop', 'temp_excursion'])
            if fault_type == 'voltage_spike':
                voltage += np.random.uniform(2.0, 5.0)
            elif fault_type == 'current_drop':
                current -= np.random.uniform(2.0, 4.0)
            elif fault_type == 'temp_excursion':
                temperature += np.random.uniform(10.0, 20.0)
                
        return {
            'timestamp': datetime.now(timezone.utc),
            'voltage': voltage,
            'current': current,
            'temperature': temperature
        }

    def train_initial_model(self):
        print(f"[*] Training PyTorch LSTM Autoencoder on historical data for {self.subsystem} (SAT-{self.object_id})...")
        # generate 500 normal points for training context
        historical_data = [self.generate_synthetic_telemetry(is_anomalous=False) for _ in range(500)]
        df = pd.DataFrame(historical_data)
        data_values = df[['voltage', 'current', 'temperature']].values
        
        # Normalize data based on mean and std
        self.mean = np.mean(data_values, axis=0)
        self.std = np.std(data_values, axis=0)
        data_normalized = (data_values - self.mean) / (self.std + 1e-6)
        
        # Create sequences
        sequences = []
        for i in range(len(data_normalized) - self.seq_len):
            sequences.append(data_normalized[i:i+self.seq_len])
        sequences = np.array(sequences)
        X_train = torch.tensor(sequences, dtype=torch.float32)

        self.model.train()
        epochs = 30
        for epoch in range(epochs):
            self.optimizer.zero_grad()
            output = self.model(X_train)
            loss = self.criterion(output, X_train)
            loss.backward()
            self.optimizer.step()
            if (epoch+1) % 10 == 0:
                print(f"    Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")

        # Calculate threshold based on training reconstruction error
        self.model.eval()
        with torch.no_grad():
            output = self.model(X_train)
            errors = torch.mean((output - X_train)**2, dim=(1, 2)).numpy()
            self.threshold = np.percentile(errors, 95) # 95th percentile
            
        self.is_trained = True
        print(f"[+] LSTM Model trained. Anomaly threshold set to: {self.threshold:.4f}")

    def detect_realtime(self, current_data):
        if not self.is_trained:
            print("Model not trained yet.")
            return

        # Add to live buffer
        features = [current_data['voltage'], current_data['current'], current_data['temperature']]
        self.live_buffer.append(features)
        
        # Keep buffer at sequence length
        if len(self.live_buffer) > self.seq_len:
            self.live_buffer.pop(0)
            
        if len(self.live_buffer) < self.seq_len:
            print("[ ] Buffering data for LSTM sequence...")
            return
            
        # Prepare tensor
        seq_array = np.array([self.live_buffer])
        seq_normalized = (seq_array - self.mean) / (self.std + 1e-6)
        X_test = torch.tensor(seq_normalized, dtype=torch.float32)

        self.model.eval()
        with torch.no_grad():
            output = self.model(X_test)
            error = torch.mean((output - X_test)**2).item()
        
        is_anomaly = (error > self.threshold)
        
        if is_anomaly:
            print(f"[!] LSTM ANOMALY DETECTED! Error: {error:.4f} > Threshold: {self.threshold:.4f}")
            self.trigger_alert(current_data, error)
        else:
            print(f"[ ] Nominal telemetry. Error: {error:.4f}")

    def trigger_alert(self, data, score):
        # Determine severity based on how much it exceeds threshold
        ratio = score / self.threshold
        if ratio > 3.0:
            severity = "CRITICAL"
            anomaly_type = "POWER_DROP"
        elif ratio > 1.5:
            severity = "WARNING"
            anomaly_type = "TELEMETRY_DEVIATION"
        else:
            severity = "INFO"
            anomaly_type = "OTHER"
            
        now = data['timestamp']
            
        payload = {
            "object_id": self.object_id,
            "subsystem": self.subsystem,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "anomaly_score": float(round(score, 3)),
            "threshold_used": float(round(self.threshold, 3)),
            "model_version": "LSTM-Autoencoder-v2.0",
            "description": f"LSTM Reconstruction Anomaly. V:{data['voltage']:.1f}V | I:{data['current']:.1f}A | T:{data['temperature']:.1f}C",
            "window_start": (now - timedelta(minutes=5)).isoformat(),
            "window_end": now.isoformat()
        }

        try:
            res = requests.post(f"{BASE_URL}/anomaly-alerts/", json=payload)
            res.raise_for_status()
            print(f"    -> Successfully pushed {severity} alert to Dashboard (Alert ID: {res.json()['alert_id']})")
        except requests.exceptions.RequestException as e:
            print(f"    -> Failed to push alert: {e}")

if __name__ == "__main__":
    print("==========================================================")
    print(" ORBITA-ATSAD REALTIME ML CLIENT (PYTORCH LSTM)           ")
    print("==========================================================")
    
    # We will monitor Satellite ID 4, Power subsystem
    detector = TelemetryAnomalyDetectorLSTM(object_id=4, subsystem="EPS")
    detector.train_initial_model()
    
    print("\n[*] Commencing live telemetry inference loop...")
    print("[*] Press Ctrl+C to stop.")
    
    try:
        while True:
            # 5% chance of injecting a real anomaly into the live feed
            is_fault = random.random() < 0.05
            
            latest_telemetry = detector.generate_synthetic_telemetry(is_anomalous=is_fault)
            detector.detect_realtime(latest_telemetry)
            
            # Real-time processing delay
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n[*] ML Client stopped by user.")
