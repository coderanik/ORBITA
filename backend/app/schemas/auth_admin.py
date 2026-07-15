"""Pydantic schemas for database-backed auth and admin management."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AuthUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    email: EmailStr
    full_name: str | None = None
    role: str
    org_id: int | None = None
    is_active: bool
    created_at: datetime


class AuthUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=255)
    role: str = "viewer"
    org_id: int | None = None
    password: str = Field(min_length=8, max_length=128)


class AuthUserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=255)
    role: str | None = None
    org_id: int | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AuthUserList(BaseModel):
    total: int
    items: list[AuthUserRead]


class ApiKeyCreate(BaseModel):
    key_name: str = Field(min_length=2, max_length=120)
    scopes: list[str] = Field(default_factory=list)


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    api_key_id: int
    user_id: int
    key_name: str
    scopes: dict
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None = None


class ApiKeyIssueResponse(BaseModel):
    api_key: str
    key_info: ApiKeyRead


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=100)


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    org_id: int
    name: str
    slug: str
    created_at: datetime
