"""
conftest.py — Pytest fixtures for CyberShield test suite.
Located in: backend/tests/
The backend root (parent dir) is added to sys.path so app.py can be imported.
"""
import sys
import os
import pytest

# Add backend/ root to path so `from app import app` works
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app import app as flask_app

@pytest.fixture(scope="module")
def client():
    """Flask test client with persistent session support."""
    flask_app.config.update({
        "TESTING": True,
        "SECRET_KEY": "test-secret-key-fixed",
        "WTF_CSRF_ENABLED": False,
    })
    with flask_app.test_client() as c:
        yield c

@pytest.fixture(scope="module")
def auth_client(client):
    """Test client that is already registered and logged in."""
    client.post("/register", json={
        "username": "allure_test_user",
        "password": "Test@1234",
        "email": "allure_test@cybershield.local"
    })
    r = client.post("/login", json={
        "username": "allure_test_user",
        "password": "Test@1234"
    })
    assert r.status_code == 200, f"Login failed: {r.data}"
    return client
