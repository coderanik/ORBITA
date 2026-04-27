from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import tle
from app.auth.dependencies import get_current_user


def test_manual_tle_requires_valid_line_format():
    app = FastAPI()
    app.include_router(tle.router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": 1,
        "email": "admin@orbita.dev",
        "role": "admin",
        "org_id": 1,
    }
    client = TestClient(app)

    response = client.post(
        "/api/v1/tle/manual",
        json={
            "name": "TEST-SAT",
            "line1": "X invalid",
            "line2": "2 25544  51.6444 177.2413 0006703 130.5360 325.0288 15.50084896398443",
        },
    )
    assert response.status_code == 422 or response.status_code == 400
