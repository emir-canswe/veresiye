def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()
    assert "calisiyor" in r.json()["message"].lower()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert body.get("detail", {}).get("database") == "ok"
