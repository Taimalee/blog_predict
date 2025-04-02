from fastapi import APIRouter
from app.api.v1.endpoints import simple, users, predict, posts

api_router = APIRouter()

# Include only the simple endpoints without authentication
api_router.include_router(simple.router, tags=["simple"])

# Include the user endpoints
api_router.include_router(users.router, tags=["users"])

# Include the prediction endpoints
api_router.include_router(predict.router, prefix="/predict", tags=["predict"])

# Include the posts endpoints
api_router.include_router(posts.router, prefix="/posts", tags=["posts"]) 