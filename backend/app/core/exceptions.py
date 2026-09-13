"""Jerarquía de errores propios de la aplicación, traducidos a HTTP en main.py."""
from __future__ import annotations


class AppError(Exception):
    """Base para todos los errores de negocio/aplicación."""

    status_code: int = 400
    code: str = "APP_ERROR"

    def __init__(self, detail: str, code: str | None = None):
        self.detail = detail
        if code:
            self.code = code
        super().__init__(detail)


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class TooManyRequestsError(AppError):
    status_code = 429
    code = "TOO_MANY_REQUESTS"


class BusinessRuleError(AppError):
    """Se lanza cuando el RuleEngine encuentra al menos una violación ERROR."""

    status_code = 422
    code = "BUSINESS_RULE_VIOLATION"

    def __init__(self, detail: str, violations: list[dict] | None = None):
        self.violations = violations or []
        super().__init__(detail)
