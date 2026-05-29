from typing import List
from fastapi import APIRouter, Query, Depends, Path
from app.role.model import RoleOut, RoleBase
from app.user.model import User
from app.models.util.model import Message
from app.role.service import RoleService
from app.utills.dependencies import CheckScope, admin_access, get_role_service

role_router = APIRouter(tags=["User Role Management"], prefix="/role", dependencies=[Depends(admin_access)])
manage_roles = Depends(CheckScope("role.write"))





@role_router.get("/all", response_model=List[RoleOut], dependencies=[manage_roles])
async def get_all_roles(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, le=1000),
        role_service: RoleService = Depends(get_role_service)
) -> List[RoleOut]:
    return await role_service.get_all_roles(skip=skip, limit=limit)


@role_router.get("/by_id/{role_id}", response_model=RoleOut, dependencies=[manage_roles])
async def get_role_by_id(
        role_id: str = Path(..., description="Role ID"),
        role_service: RoleService = Depends(get_role_service)
) -> RoleOut:
    return await role_service.get_role_by_id(role_id)


@role_router.post("/create", response_model=RoleOut, dependencies=[manage_roles])
async def create_role(
        role_data: RoleBase,
        current_admin: User = Depends(admin_access),
        role_service: RoleService = Depends(get_role_service)
) -> RoleOut:
    return await role_service.create_role(role_data, current_admin.email)


@role_router.put("/update/{role_id}", response_model=RoleOut, dependencies=[manage_roles])
async def update_role(
        role_data: RoleBase,
        role_id: str = Path(..., description="Role ID"),
        role_service: RoleService = Depends(get_role_service)
) -> RoleOut:
    return await role_service.update_role(role_id, role_data)


@role_router.delete("/delete/{role_id}", dependencies=[manage_roles])
async def delete_role(
        role_id: str = Path(..., description="Role ID"),
        role_service: RoleService = Depends(get_role_service)
) -> Message:
    return await role_service.delete_role(role_id)
