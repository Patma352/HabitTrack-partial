from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests as req_lib
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> dict:
    session_token = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        session_token = auth_header[7:]
    if not session_token:
        session_token = request.cookies.get('session_token')
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== REQUEST MODELS ====================

class SessionRequest(BaseModel):
    session_id: str

class GoalsUpdate(BaseModel):
    steps_goal: Optional[int] = None
    water_goal: Optional[int] = None
    sleep_goal: Optional[float] = None
    calories_goal: Optional[int] = None

class HabitLogCreate(BaseModel):
    habit_type: str
    value: float

class ProductCreate(BaseModel):
    name: str
    description: str
    price_coins: int
    image_url: str
    category: str
    size_options: List[str] = []
    stock: int = 100

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_coins: Optional[int] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    size_options: Optional[List[str]] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None

class OrderCreate(BaseModel):
    product_id: str
    size: Optional[str] = None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(body: SessionRequest):
    resp = req_lib.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": body.session_id},
        timeout=10
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid session")

    data = resp.json()
    email = data['email']
    name = data['name']
    picture = data.get('picture', '')
    session_token = data['session_token']

    admin_emails = [e.strip() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]
    is_admin = email.strip() in admin_emails

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing['user_id']
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture, "is_admin": is_admin}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "coins": 0,
            "is_admin": is_admin,
            "created_at": datetime.now(timezone.utc)
        })
        await db.habit_goals.insert_one({
            "user_id": user_id,
            "steps_goal": 10000,
            "water_goal": 8,
            "sleep_goal": 8.0,
            "calories_goal": 500,
            "updated_at": datetime.now(timezone.utc)
        })

    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    response = JSONResponse(content={"user": user, "session_token": session_token})
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")
    return response

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(request: Request):
    auth_header = request.headers.get('Authorization', '')
    session_token = auth_header[7:] if auth_header.startswith('Bearer ') else request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token")
    return response

# ==================== HABIT ROUTES ====================

@api_router.get("/habits/goals")
async def get_goals(request: Request):
    user = await get_current_user(request)
    goals = await db.habit_goals.find_one({"user_id": user['user_id']}, {"_id": 0})
    if not goals:
        goals = {"user_id": user['user_id'], "steps_goal": 10000, "water_goal": 8, "sleep_goal": 8.0, "calories_goal": 500}
    return goals

@api_router.put("/habits/goals")
async def update_goals(body: GoalsUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc)
    await db.habit_goals.update_one({"user_id": user['user_id']}, {"$set": update_data}, upsert=True)
    return await db.habit_goals.find_one({"user_id": user['user_id']}, {"_id": 0})

@api_router.get("/habits/today")
async def get_today_habits(request: Request):
    user = await get_current_user(request)
    today = date.today().isoformat()
    logs = await db.habit_logs.find({"user_id": user['user_id'], "date": today}, {"_id": 0}).to_list(200)
    goals = await db.habit_goals.find_one({"user_id": user['user_id']}, {"_id": 0})
    if not goals:
        goals = {"steps_goal": 10000, "water_goal": 8, "sleep_goal": 8.0, "calories_goal": 500}

    totals = {"steps": 0.0, "water": 0.0, "sleep": 0.0, "calories": 0.0}
    for log in logs:
        h = log.get('habit_type', '')
        if h in totals:
            totals[h] += log.get('value', 0)

    completed = {}
    for habit_type in ["steps", "water", "sleep", "calories"]:
        tx = await db.coin_transactions.find_one({"user_id": user['user_id'], "reason": f"{habit_type}_goal_{today}"})
        completed[habit_type] = tx is not None

    return {"date": today, "totals": totals, "goals": goals, "completed": completed}

@api_router.get("/habits/history")
async def get_habit_history(request: Request):
    user = await get_current_user(request)
    logs = await db.habit_logs.find({"user_id": user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return logs

@api_router.post("/habits/log")
async def log_habit(body: HabitLogCreate, request: Request):
    user = await get_current_user(request)
    today = date.today().isoformat()
    user_id = user['user_id']

    if body.habit_type not in ["steps", "water", "sleep", "calories"]:
        raise HTTPException(status_code=400, detail="Invalid habit type")

    log_id = f"log_{uuid.uuid4().hex[:12]}"
    await db.habit_logs.insert_one({
        "log_id": log_id,
        "user_id": user_id,
        "date": today,
        "habit_type": body.habit_type,
        "value": body.value,
        "created_at": datetime.now(timezone.utc)
    })

    goals = await db.habit_goals.find_one({"user_id": user_id}, {"_id": 0})
    if not goals:
        goals = {"steps_goal": 10000, "water_goal": 8, "sleep_goal": 8.0, "calories_goal": 500}

    today_logs = await db.habit_logs.find(
        {"user_id": user_id, "date": today, "habit_type": body.habit_type}, {"_id": 0}
    ).to_list(200)
    total = sum(l.get('value', 0) for l in today_logs)

    coin_rewards = {"steps": 10, "water": 8, "sleep": 5, "calories": 7}
    goal_keys = {"steps": "steps_goal", "water": "water_goal", "sleep": "sleep_goal", "calories": "calories_goal"}

    coins_earned = 0
    goal_completed = False
    goal_value = goals.get(goal_keys[body.habit_type], 0)
    already_rewarded = await db.coin_transactions.find_one({
        "user_id": user_id, "reason": f"{body.habit_type}_goal_{today}"
    })

    if total >= goal_value and not already_rewarded:
        coins_to_award = coin_rewards[body.habit_type]
        coins_earned = coins_to_award
        goal_completed = True
        await db.coin_transactions.insert_one({
            "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "amount": coins_to_award,
            "reason": f"{body.habit_type}_goal_{today}",
            "description": f"Completed {body.habit_type.capitalize()} goal!",
            "type": "earned",
            "created_at": datetime.now(timezone.utc)
        })
        await db.users.update_one({"user_id": user_id}, {"$inc": {"coins": coins_to_award}})

    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "log_id": log_id,
        "habit_type": body.habit_type,
        "value": body.value,
        "total_today": total,
        "goal_completed": goal_completed,
        "coins_earned": coins_earned,
        "current_coins": updated_user.get('coins', 0)
    }

# ==================== COINS ROUTES ====================

@api_router.get("/coins")
async def get_coins(request: Request):
    user = await get_current_user(request)
    transactions = await db.coin_transactions.find(
        {"user_id": user['user_id']}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"balance": user.get('coins', 0), "transactions": transactions}

# ==================== PRODUCTS ROUTES ====================

@api_router.get("/products")
async def get_products(category: Optional[str] = None):
    query = {"is_active": True}
    if category and category != "All":
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products")
async def create_product(body: ProductCreate, request: Request):
    await get_admin_user(request)
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    doc = {"product_id": product_id, **body.model_dump(), "is_active": True, "created_at": datetime.now(timezone.utc)}
    await db.products.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, request: Request):
    await get_admin_user(request)
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    await get_admin_user(request)
    await db.products.update_one({"product_id": product_id}, {"$set": {"is_active": False}})
    return {"message": "Product deleted"}

# ==================== ORDERS ROUTES ====================

@api_router.post("/orders")
async def create_order(body: OrderCreate, request: Request):
    user = await get_current_user(request)
    user_id = user['user_id']

    product = await db.products.find_one({"product_id": body.product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if user.get('coins', 0) < product['price_coins']:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    if product.get('stock', 0) <= 0:
        raise HTTPException(status_code=400, detail="Out of stock")

    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    await db.users.update_one({"user_id": user_id}, {"$inc": {"coins": -product['price_coins']}})
    await db.products.update_one({"product_id": body.product_id}, {"$inc": {"stock": -1}})

    await db.coin_transactions.insert_one({
        "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "amount": -product['price_coins'],
        "reason": f"purchase_{order_id}",
        "description": f"Purchased {product['name']}",
        "type": "spent",
        "created_at": datetime.now(timezone.utc)
    })
    await db.orders.insert_one({
        "order_id": order_id,
        "user_id": user_id,
        "product_id": body.product_id,
        "product_name": product['name'],
        "product_image": product['image_url'],
        "price_coins": product['price_coins'],
        "size": body.size,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc)
    })

    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"order_id": order_id, "status": "confirmed", "coins_spent": product['price_coins'], "remaining_coins": updated_user.get('coins', 0)}

@api_router.get("/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.orders.find({"user_id": user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return orders

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    await get_admin_user(request)
    return {
        "users_count": await db.users.count_documents({}),
        "orders_count": await db.orders.count_documents({}),
        "products_count": await db.products.count_documents({"is_active": True}),
        "recent_orders": await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    }

@api_router.get("/admin/products")
async def get_admin_products(request: Request):
    await get_admin_user(request)
    return await db.products.find({}, {"_id": 0}).to_list(200)

# ==================== SETUP ====================

@app.on_event("startup")
async def seed_products():
    count = await db.products.count_documents({"is_active": True})
    if count == 0:
        sample_products = [
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "FitPro Hoodie", "description": "Premium comfort hoodie for active lifestyle. Soft fleece interior with moisture-wicking exterior.", "price_coins": 150, "image_url": "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80", "category": "Tops", "size_options": ["XS", "S", "M", "L", "XL"], "stock": 50, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Active Joggers", "description": "Lightweight track pants perfect for running or casual wear. 4-way stretch fabric.", "price_coins": 120, "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80", "category": "Bottoms", "size_options": ["XS", "S", "M", "L", "XL"], "stock": 30, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Urban Sneakers", "description": "Sleek everyday sneakers combining style and performance. Cushioned sole for all-day comfort.", "price_coins": 200, "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", "category": "Shoes", "size_options": ["6", "7", "8", "9", "10", "11"], "stock": 25, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Performance Tee", "description": "Breathable performance t-shirt with anti-odor technology. Perfect for workouts.", "price_coins": 80, "image_url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80", "category": "Tops", "size_options": ["XS", "S", "M", "L", "XL", "XXL"], "stock": 60, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Sport Jacket", "description": "Versatile sport jacket with zip pockets. Wind-resistant for outdoor activities.", "price_coins": 250, "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80", "category": "Tops", "size_options": ["S", "M", "L", "XL"], "stock": 20, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Yoga Leggings", "description": "High-waist compression leggings with phone pocket. Ideal for yoga and gym.", "price_coins": 110, "image_url": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80", "category": "Bottoms", "size_options": ["XS", "S", "M", "L"], "stock": 40, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Cap & Visor", "description": "Adjustable athletic cap with UV protection. Keeps you cool during outdoor workouts.", "price_coins": 60, "image_url": "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&q=80", "category": "Accessories", "size_options": [], "stock": 80, "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"product_id": f"prod_{uuid.uuid4().hex[:12]}", "name": "Gym Bag", "description": "Spacious gym duffel bag with shoe compartment. Water-resistant material.", "price_coins": 180, "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80", "category": "Accessories", "size_options": [], "stock": 15, "is_active": True, "created_at": datetime.now(timezone.utc)},
        ]
        await db.products.insert_many(sample_products)
        logger.info(f"Seeded {len(sample_products)} products")

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
