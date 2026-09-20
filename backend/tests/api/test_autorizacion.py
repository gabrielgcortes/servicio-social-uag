"""Tests de autorización HTTP: un DIRECTOR de una carrera no puede editar
otra carrera, ni siquiera vía rutas anidadas (materia/semestre/elemento) —
ver §12 del plan: la autorización no puede depender de esconder botones."""
from app.core.security import create_access_token, hash_password
from app.models.carrera import Carrera
from app.models.enums import RolUsuario, TipoMateria
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.usuario import Usuario


def _crear_carrera(db_session, clave):
    carrera = Carrera(clave=clave, nombre=f"Carrera {clave}")
    db_session.add(carrera)
    db_session.flush()
    return carrera


def _crear_plan(db_session, carrera, clave):
    plan = PlanCurricular(carrera_id=carrera.id, clave=clave, max_creditos_semestre=50)
    db_session.add(plan)
    db_session.flush()
    return plan


def _token_para(usuario):
    return create_access_token(subject=usuario.id)


def test_director_no_puede_editar_otra_carrera(client, db_session):
    carrera_a = _crear_carrera(db_session, "AAA")
    carrera_b = _crear_carrera(db_session, "BBB")
    plan_b = _crear_plan(db_session, carrera_b, "BBB-2025")

    director_a = Usuario(
        nombre="Director A",
        email="directora@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.DIRECTOR,
        carreras=[carrera_a],
    )
    db_session.add(director_a)
    db_session.flush()

    materia_b = Materia(
        plan_curricular_id=plan_b.id,
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

    resp = client.post(f"/api/planes/{plan_b.id}/semestres", json={}, headers=headers)
    assert resp.status_code == 403


def test_usuario_no_puede_mutar_nada(client, db_session):
    carrera = _crear_carrera(db_session, "CCC")
    usuario = Usuario(
        nombre="Estudiante",
        email="estudiante@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.USUARIO,
        carreras=[carrera],
    )
    db_session.add(usuario)
    db_session.commit()

    headers = {"Authorization": f"Bearer {_token_para(usuario)}"}
    plan = _crear_plan(db_session, carrera, "CCC-2025")
    db_session.commit()
    assert client.get(f"/api/planes/{plan.id}", headers=headers).status_code == 200
    assert (
        client.patch(
            f"/api/planes/{plan.id}", json={"descripcion": "No permitido"}, headers=headers
        ).status_code
        == 403
    )
    resp = client.post(f"/api/planes/{plan.id}/semestres", json={}, headers=headers)
    assert resp.status_code == 403


def test_admin_puede_editar_cualquier_carrera(client, db_session):
    carrera = _crear_carrera(db_session, "DDD")
    admin = Usuario(
        nombre="Admin",
        email="admin2@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.ADMIN,
    )
    db_session.add(admin)
    db_session.commit()

    headers = {"Authorization": f"Bearer {_token_para(admin)}"}
    listado = client.get("/api/carreras", headers=headers)
    assert listado.status_code == 200
    assert carrera.id in {item["id"] for item in listado.json()}
    resp = client.patch(
        f"/api/carreras/{carrera.id}", json={"nombre": "Nuevo nombre"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Nuevo nombre"


def test_director_con_dos_carreras_ve_ambas_pero_no_una_tercera(client, db_session):
    carreras = [_crear_carrera(db_session, clave) for clave in ("HAA", "HBB", "HCC")]
    director = Usuario(
        nombre="Director múltiple",
        email="multi@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.DIRECTOR,
        carreras=carreras[:2],
    )
    db_session.add(director)
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_para(director)}"}

    listado = client.get("/api/carreras", headers=headers)
    assert listado.status_code == 200
    assert {c["id"] for c in listado.json()} == {carreras[0].id, carreras[1].id}
    assert client.get(f"/api/carreras/{carreras[0].id}", headers=headers).status_code == 200
    assert client.get(f"/api/carreras/{carreras[1].id}", headers=headers).status_code == 200
    assert client.get(f"/api/carreras/{carreras[2].id}", headers=headers).status_code == 403


def test_quitar_asignacion_tiene_efecto_sin_renovar_jwt(client, db_session):
    carrera = _crear_carrera(db_session, "REV")
    director = Usuario(
        nombre="Director revocable",
        email="revocable@test.com",
        password_hash=hash_password("Password123!"),
        rol=RolUsuario.DIRECTOR,
        carreras=[carrera],
    )
    db_session.add(director)
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_para(director)}"}
    assert client.get(f"/api/carreras/{carrera.id}", headers=headers).status_code == 200

    director.carreras = []
    db_session.commit()
    assert client.get(f"/api/carreras/{carrera.id}", headers=headers).status_code == 403
