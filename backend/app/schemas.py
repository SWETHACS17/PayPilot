from pydantic import BaseModel
from datetime import date
from typing import Optional


class UserCreate(BaseModel):
    name: str
    phone: str


class UserResponse(BaseModel):
    id: int
    name: str
    phone: str

    class Config:
        from_attributes = True


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    amount: float
    description: str
    due_date: date
    customer_id: int


class InvoiceResponse(BaseModel):
    id: int
    amount: float
    description: str
    due_date: date
    status: str

    class Config:
        from_attributes = True
