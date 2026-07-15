"""
WebSocket API routes.
"""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.manager import manager
from app.websocket.events import WSEvent
from app.auth.jwt_handler import verify_token

router = APIRouter(tags=["WebSockets"])


async def _heartbeat_loop(websocket: WebSocket, interval_s: int = 20):
    while True:
        await asyncio.sleep(interval_s)
        await websocket.send_json({
            "type": WSEvent.HEARTBEAT,
            "data": {"status": "alive"},
        })


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    Main WebSocket endpoint for frontend clients to connect to.
    Provides real-time updates for telemetry, alerts, and simulations.
    
    Requires JWT token as query parameter: ws://host/api/v1/ws?token=<JWT>
    """
    try:
        payload = verify_token(token)
        if not payload:
            await websocket.close(code=1008, reason="Invalid token")
            return
    except Exception as e:
        await websocket.close(code=1008, reason=f"Authentication failed: {str(e)}")
        return
    
    await manager.connect(websocket)
    heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket))
    try:
        while True:
            data = await websocket.receive_text()
            if data.strip().lower() == "ping":
                await websocket.send_json({
                    "type": WSEvent.PONG,
                    "data": {"status": "ok"},
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket Route Error]: {e}")
        manager.disconnect(websocket)
    finally:
        heartbeat_task.cancel()
