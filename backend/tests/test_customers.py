def test_create_and_list_customers(client):
    r = client.post(
        "/customers/",
        json={"name": "  Test Müşteri  ", "phone": None, "ibans": []},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Test Müşteri"

    r = client.get("/customers/")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Test Müşteri"


def test_duplicate_customer_name(client):
    # SQLite + PostgreSQL'te tutarlı: ASCII büyük/küçük harf (Türkçe İ/ı ilike farkı pytest SQLite'ta 400 vermeyebiliyor)
    client.post("/customers/", json={"name": "Dup Müşteri", "ibans": []})
    r = client.post("/customers/", json={"name": "dup müşteri", "ibans": []})
    assert r.status_code == 400
