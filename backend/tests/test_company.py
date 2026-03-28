def test_company_settings_requires_auth(client):
    r = client.get("/company/settings")
    assert r.status_code == 401


def test_company_settings_get_and_put_admin(client):
    client.post(
        "/auth/register",
        json={"username": "co_admin", "password": "secret12", "role": "admin"},
    )
    r = client.post(
        "/auth/login",
        data={"username": "co_admin", "password": "secret12"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/company/settings", headers=headers)
    assert r.status_code == 200
    assert "company_name" in r.json()

    r = client.put(
        "/company/settings",
        headers=headers,
        json={
            "company_name": "Test A.Ş.",
            "tax_id": "123",
            "phone": "0555",
            "city": "İstanbul",
            "address": "Adres",
        },
    )
    assert r.status_code == 200
    assert r.json()["company_name"] == "Test A.Ş."
    assert r.json()["tax_id"] == "123"
