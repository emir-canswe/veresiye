def test_register_login_and_me(client):
    r = client.post(
        "/auth/register",
        json={"username": "testuser", "password": "secret12", "role": "calisan"},
    )
    assert r.status_code == 200
    assert r.json()["username"] == "testuser"

    r = client.post(
        "/auth/login",
        data={"username": "testuser", "password": "secret12"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "testuser"
    assert r.json()["role"] == "calisan"


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"username": "u2", "password": "rightpass1", "role": "calisan"},
    )
    r = client.post(
        "/auth/login",
        data={"username": "u2", "password": "wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 400
