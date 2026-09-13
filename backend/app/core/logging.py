"""Configuración centralizada de logging para toda la aplicación."""
import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if root.handlers:
        return  # evita handlers duplicados si se llama más de una vez

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    root.addHandler(handler)
    root.setLevel(level)
