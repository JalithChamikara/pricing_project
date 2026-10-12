from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_options():
    r = client.get("/options").json()
    assert "Galle" in r["districts"] and "guesthouse" in r["property_types"]


def test_recommend():
    body = {"district": "Galle", "property_type": "guesthouse", "base_rate": 12000,
            "start_date": "2026-12-20", "end_date": "2026-12-22"}
    r = client.post("/recommend", json=body)
    assert r.status_code == 200
    data = r.json()["recommendations"]
    assert len(data) == 3
    for x in data:
        assert 0 <= x["predicted_occupancy"] <= 100
        assert 10800 <= x["recommended_price"] <= 24000   # between 0.9x and 2x the base rate
        assert "Suggested price" in x["explanation"]


def test_bad_district():
    body = {"district": "Moon", "property_type": "villa", "base_rate": 10000,
            "start_date": "2026-12-20", "end_date": "2026-12-21"}
    assert client.post("/recommend", json=body).status_code == 400


def test_bad_dates():
    body = {"start_date": "2026-12-25", "end_date": "2026-12-20"}
    assert client.post("/forecast", json=body).status_code == 422
