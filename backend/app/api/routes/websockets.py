"""
WebSocket API routes.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for frontend clients to connect to.
    Provides real-time updates for telemetry, alerts, and simulations.
    """
    await manager.connect(websocket)
    try:
        while True:
            # We mostly push data, but clients can send messages too (e.g., ping/pong or subscriptions)
            data = await websocket.receive_text()
            # Echo or process client message if needed
            # await manager.broadcast("CLIENT_MESSAGE", {"message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket Route Error]: {e}")
        manager.disconnect(websocket)
