import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def restore_activities():
    # Make a deep copy of activities and restore after each test
    orig = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(orig)


def test_get_activities():
    client = TestClient(app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Expect known activity keys
    assert "Chess Club" in data


def test_signup_and_duplicate_reject():
    client = TestClient(app)
    activity = "Chess Club"
    email = "testuser@example.com"

    # signup should succeed
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # duplicate signup should return 400
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400


def test_unregister_participant():
    client = TestClient(app)
    activity = "Programming Class"
    email = "sophia@mergington.edu"

    # ensure email is present initially
    assert email in activities[activity]["participants"]

    # unregister
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 200

    # unregistering again should return 404
    resp2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp2.status_code == 404


def test_availability_updates_on_signup_and_unregister():
    client = TestClient(app)
    activity = "Math Olympiad"
    email = "availability_test@example.com"

    # compute spots left before
    before = activities[activity]["max_participants"] - len(activities[activity]["participants"])

    # signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200

    after_signup = activities[activity]["max_participants"] - len(activities[activity]["participants"])
    assert after_signup == before - 1

    # unregister
    resp2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp2.status_code == 200

    after_unregister = activities[activity]["max_participants"] - len(activities[activity]["participants"])
    assert after_unregister == before