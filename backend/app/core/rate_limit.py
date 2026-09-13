"""Rate limiting simple en memoria del proceso, solo para /auth/login.
Solución de demo: con varios workers/replicas cada proceso lleva su propio
conteo. En producción real, sustituir por un límite en el reverse proxy
(p. ej. `limit_req` de nginx) — no se agrega Redis aquí porque hoy no existe
esa necesidad concreta."""
from __future__ import annotations

import time
from collections import defaultdict

_INTENTOS_MAXIMOS = 5
_VENTANA_SEGUNDOS = 60

_intentos: dict[str, list[float]] = defaultdict(list)


def registrar_intento_y_verificar(clave: str) -> bool:
    """Devuelve True si el intento está permitido; False si se superó el límite."""
    ahora = time.monotonic()
    intentos = _intentos[clave]
    intentos[:] = [t for t in intentos if ahora - t < _VENTANA_SEGUNDOS]
    if len(intentos) >= _INTENTOS_MAXIMOS:
        return False
    intentos.append(ahora)
    return True
