"""
WebSocket connection manager.
"""

from fastapi import WebSocket
from datetime import datetime, timezone
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, payload: dict):
        """
        Broadcasts a JSON message to all connected clients.
        """
        message = {
            "type": event_type,
            "data": payload,
            "ts": datetime.now(timezone.utc).isoformat()
        }
        
        # Create a copy of the list to avoid issues if connections drop during iteration
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WebSocket] Failed to send message: {e}")
                self.disconnect(connection)

# Singleton instance to be used across the app
manager = ConnectionManager()
