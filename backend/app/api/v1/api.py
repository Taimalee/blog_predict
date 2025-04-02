from fastapi import APIRouter
from app.api.v1.endpoints import login, posts, predict

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(predict.router, prefix="/predict", tags=["predict"]) 