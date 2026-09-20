"""Tests del flujo de login/refresh/logout (auth local)."""
from app.core.security import hash_password
from app.models.carrera import Carrera
from app.models.enums import RolUsuario
from app.models.usuario import Usuario


def test_login_exitoso_y_me(client, db_session):
    carrera = Carrera(clave="EEE", nombre="Carrera E")
    db_session.add(carrera)
    db_session.flush()
    usuario = Usuario(
        nombre="Usuario Test",
        email="login@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.USUARIO,
        carreras=[carrera],
    )
    db_session.add(usuario)
    db_session.commit()

    resp = client.post(
        "/api/auth/login", json={"email": "login@test.com", "password": "Password123!"}
    )
    assert resp.status_code == 200
    access_token = resp.json()["access_token"]
    assert "refresh_token" in resp.cookies

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "login@test.com"
    assert me.json()["carrera_ids"] == [carrera.id]


def test_login_credenciales_invalidas(client, db_session):
    resp = client.post("/api/auth/login", json={"email": "no-existe@test.com", "password": "x"})
    assert resp.status_code == 401


def test_me_sin_token_es_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
