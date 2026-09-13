"""Tests de autorización HTTP: un DIRECTOR de una carrera no puede editar
otra carrera, ni siquiera vía rutas anidadas (materia/semestre/elemento) —
ver §12 del plan: la autorización no puede depender de esconder botones."""
from app.core.security import create_access_token, hash_password
from app.models.carrera import Carrera
from app.models.enums import RolUsuario, TipoMateria
from app.models.materia import Materia
from app.models.usuario import Usuario


def _crear_carrera(db_session, clave):
    carrera = Carrera(clave=clave, nombre=f"Carrera {clave}", max_creditos_semestre=50)
    db_session.add(carrera)
    db_session.flush()
    return carrera


def _token_para(usuario):
    return create_access_token(
        subject=usuario.id, rol=usuario.rol.value, carrera_id=usuario.carrera_id
    )


def test_director_no_puede_editar_otra_carrera(client, db_session):
    carrera_a = _crear_carrera(db_session, "AAA")
    carrera_b = _crear_carrera(db_session, "BBB")

    director_a = Usuario(
        nombre="Director A",
        email="directora@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.DIRECTOR,
        carrera_id=carrera_a.id,
    )
    db_session.add(director_a)
    db_session.flush()

    materia_b = Materia(
        carrera_id=carrera_b.id,
        clave="X001",
        nombre="Materia de B",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OBLIGATORIA,
    )
    db_session.add(materia_b)
    db_session.commit()

    headers = {"Authorization": f"Bearer {_token_para(director_a)}"}

    resp = client.patch(
        f"/api/carreras/{carrera_b.id}", json={"nombre": "Hackeada"}, headers=headers
    )
    assert resp.status_code == 403

    resp = client.patch(
        f"/api/materias/{materia_b.id}", json={"nombre": "Hackeada"}, headers=headers
    )
    assert resp.status_code == 403

    resp = client.post(f"/api/carreras/{carrera_b.id}/semestres", json={}, headers=headers)
    assert resp.status_code == 403


def test_usuario_no_puede_mutar_nada(client, db_session):
    carrera = _crear_carrera(db_session, "CCC")
    usuario = Usuario(
        nombre="Estudiante",
        email="estudiante@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.USUARIO,
        carrera_id=carrera.id,
    )
    db_session.add(usuario)
    db_session.commit()

    headers = {"Authorization": f"Bearer {_token_para(usuario)}"}
    resp = client.post(f"/api/carreras/{carrera.id}/semestres", json={}, headers=headers)
    assert resp.status_code == 403


def test_admin_puede_editar_cualquier_carrera(client, db_session):
    carrera = _crear_carrera(db_session, "DDD")
    admin = Usuario(
        nombre="Admin",
        email="admin2@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.ADMIN,
        carrera_id=None,
    )
    db_session.add(admin)
    db_session.commit()

    headers = {"Authorization": f"Bearer {_token_para(admin)}"}
    resp = client.patch(
        f"/api/carreras/{carrera.id}", json={"nombre": "Nuevo nombre"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Nuevo nombre"
