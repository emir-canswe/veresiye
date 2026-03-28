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
    client.post("/customers/", json={"name": "Aynı İsim", "ibans": []})
    r = client.post("/customers/", json={"name": "aynı isim", "ibans": []})
    assert r.status_code == 400
