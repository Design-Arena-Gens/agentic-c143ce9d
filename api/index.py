import os
import json
from typing import Any, Dict

# Vercel Python entrypoint expects `handler(request)` returning response body

from flask import Flask, request
from werkzeug.wrappers import Response

# Lightweight app using blueprints-like manual routing to run on Vercel
app = Flask(__name__)

# Simple in-memory store for demo fallback
IN_MEMORY_DB: Dict[str, Any] = {
    'users': {},
    'otp': {},
    'portfolios': {},
}

# MongoDB optional integration
from pymongo import MongoClient
from pymongo.collection import Collection

MONGO_URI = os.environ.get('MONGODB_URI')
mongo_client: MongoClient | None = None
users_col: Collection | None = None
portfolio_col: Collection | None = None
otp_col: Collection | None = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        dbname = os.environ.get('MONGODB_DB', 'agentic')
        db = mongo_client[dbname]
        users_col = db['users']
        portfolio_col = db['portfolios']
        otp_col = db['otp']
    except Exception:
        mongo_client = None
        users_col = None
        portfolio_col = None
        otp_col = None

# Helpers
import hashlib
import hmac
import time
import random

JWT_SECRET = os.environ.get('JWT_SECRET', 'devsecret')


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_jwt(payload: Dict[str, Any]) -> str:
    # Minimal non-standard JWT-like token for demo only
    header = json.dumps({"alg": "HS256", "typ": "JWT"})
    body = json.dumps(payload)
    token = f"{header}.{body}"
    sig = hmac.new(JWT_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()
    return f"{token}.{sig}"


def verify_jwt(token: str) -> Dict[str, Any] | None:
    try:
        header, body, sig = token.split('.')
        exp_sig = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, exp_sig):
            return None
        payload = json.loads(body)
        if payload.get('exp') and payload['exp'] < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def json_response(data: Any, status: int = 200) -> Response:
    return Response(json.dumps(data), status=status, mimetype='application/json')


# Routes
@app.route('/auth/signup', methods=['POST'])
def signup():
    body = request.get_json(force=True)
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    if not email or not password:
        return json_response({ 'message': 'Email and password required' }, 400)
    if users_col:
        if users_col.find_one({'_id': email}):
            return json_response({ 'message': 'User exists' }, 400)
        users_col.insert_one({
            '_id': email,
            'email': email,
            'password_hash': hash_password(password),
            'verified': False,
            'created_at': int(time.time())
        })
    else:
        if email in IN_MEMORY_DB['users']:
        return json_response({ 'message': 'User exists' }, 400)
        IN_MEMORY_DB['users'][email] = {
            'email': email,
            'password_hash': hash_password(password),
            'verified': False,
            'created_at': int(time.time())
        }
    otp = f"{random.randint(100000, 999999)}"
    if otp_col:
        otp_col.update_one({'_id': email}, { '$set': { 'otp': otp, 'exp': int(time.time()) + 600 } }, upsert=True)
    else:
        IN_MEMORY_DB['otp'][email] = { 'otp': otp, 'exp': int(time.time()) + 600 }
    # In real app, send via email/SMS provider
    print(f"OTP for {email}: {otp}")
    return json_response({ 'message': 'OTP sent' })


@app.route('/auth/verify', methods=['POST'])
def verify():
    body = request.get_json(force=True)
    email = (body.get('email') or '').strip().lower()
    otp = (body.get('otp') or '').strip()
    rec = None
    if otp_col:
        doc = otp_col.find_one({'_id': email})
        if doc:
            rec = { 'otp': doc.get('otp'), 'exp': doc.get('exp', 0) }
    else:
        rec = IN_MEMORY_DB['otp'].get(email)
    if not rec or rec['otp'] != otp or rec['exp'] < int(time.time()):
        return json_response({ 'message': 'Invalid OTP' }, 400)
    if users_col:
        if not users_col.find_one({'_id': email}):
            return json_response({ 'message': 'User not found' }, 404)
        users_col.update_one({'_id': email}, { '$set': { 'verified': True } })
    else:
        user = IN_MEMORY_DB['users'].get(email)
        if not user:
            return json_response({ 'message': 'User not found' }, 404)
        user['verified'] = True
    token = create_jwt({ 'sub': email, 'exp': int(time.time()) + 3600*24*7 })
    return json_response({ 'token': token })


@app.route('/auth/login', methods=['POST'])
def login():
    body = request.get_json(force=True)
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    if users_col:
        user = users_col.find_one({'_id': email})
        if not user or user.get('password_hash') != hash_password(password):
            return json_response({ 'message': 'Invalid credentials' }, 401)
        if not user.get('verified'):
            return json_response({ 'message': 'Account not verified' }, 403)
    else:
        user = IN_MEMORY_DB['users'].get(email)
        if not user or user['password_hash'] != hash_password(password):
            return json_response({ 'message': 'Invalid credentials' }, 401)
        if not user.get('verified'):
            return json_response({ 'message': 'Account not verified' }, 403)
    token = create_jwt({ 'sub': email, 'exp': int(time.time()) + 3600*24*7 })
    return json_response({ 'token': token })


def auth_email_from_request() -> str | None:
    auth = request.headers.get('authorization') or request.headers.get('Authorization')
    if not auth or not auth.lower().startswith('bearer '):
        return None
    token = auth.split(' ', 1)[1]
    payload = verify_jwt(token)
    return None if not payload else payload.get('sub')


@app.route('/portfolio', methods=['GET'])
def get_portfolio():
    email = auth_email_from_request()
    if not email:
        return json_response({ 'message': 'Unauthorized' }, 401)
    if portfolio_col:
        doc = portfolio_col.find_one({'_id': email})
        if not doc:
            doc = { '_id': email, 'cash': 100000, 'positions': {} }
            portfolio_col.insert_one(doc)
        portfolio = { 'cash': doc.get('cash', 0), 'positions': doc.get('positions', {}) }
    else:
        portfolio = IN_MEMORY_DB['portfolios'].setdefault(email, {
            'cash': 100000,
            'positions': {}
        })
    return json_response(portfolio)


@app.route('/portfolio/trade', methods=['POST'])
def trade():
    email = auth_email_from_request()
    if not email:
        return json_response({ 'message': 'Unauthorized' }, 401)
    body = request.get_json(force=True)
    symbol = (body.get('symbol') or '').upper()
    side = (body.get('side') or '').lower()
    shares = int(body.get('shares') or 0)
    if not symbol or side not in ('buy', 'sell') or shares <= 0:
        return json_response({ 'message': 'Invalid trade' }, 400)
    # mock price
    price = 100.0 + (hash(symbol) % 200) / 10.0
    if portfolio_col:
        doc = portfolio_col.find_one({'_id': email})
        if not doc:
            doc = { '_id': email, 'cash': 100000, 'positions': {} }
        portfolio = { 'cash': doc.get('cash', 0), 'positions': doc.get('positions', {}) }
    else:
        portfolio = IN_MEMORY_DB['portfolios'].setdefault(email, { 'cash': 100000, 'positions': {} })
    cost = price * shares
    if side == 'buy':
        if portfolio['cash'] < cost:
            return json_response({ 'message': 'Insufficient cash' }, 400)
        portfolio['cash'] -= cost
        portfolio['positions'][symbol] = portfolio['positions'].get(symbol, 0) + shares
    else:
        held = portfolio['positions'].get(symbol, 0)
        if held < shares:
            return json_response({ 'message': 'Insufficient shares' }, 400)
        portfolio['positions'][symbol] = held - shares
        portfolio['cash'] += cost
    if portfolio_col:
        portfolio_col.update_one({'_id': email}, { '$set': { 'cash': portfolio['cash'], 'positions': portfolio['positions'] } }, upsert=True)
    return json_response({ 'message': 'ok', 'price': price, 'portfolio': portfolio })


@app.route('/market/tickers', methods=['GET'])
def market_tickers():
    # simple static list
    return json_response({ 'tickers': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'] })


@app.route('/predict', methods=['GET'])
def predict():
    symbol = (request.args.get('symbol') or 'AAPL').upper()
    # Mock timeseries and prediction for now
    base = 150.0 + (hash(symbol) % 300) / 10.0
    series = []
    for i in range(30):
        close = base + (i % 5) - 2
        predicted = close + 0.5
        series.append({ 'date': f'D{i+1}', 'close': round(close, 2), 'predicted': round(predicted, 2) })
    return json_response({ 'symbol': symbol, 'series': series })


# Cloudinary upload stub
@app.route('/cloudinary/signature', methods=['GET'])
def cloudinary_signature():
    # In production, generate signature using API secret
    return json_response({ 'signature': 'stub', 'timestamp': int(time.time()) })


# Vercel entrypoint

def handler(request):
    with app.request_context(request.environ):
        response = app.full_dispatch_request()
        return response

# Duplicate routes to support Vercel function path prefix
app.add_url_rule('/api/index.py/auth/signup', view_func=signup, methods=['POST'])
app.add_url_rule('/api/index.py/auth/verify', view_func=verify, methods=['POST'])
app.add_url_rule('/api/index.py/auth/login', view_func=login, methods=['POST'])
app.add_url_rule('/api/index.py/portfolio', view_func=get_portfolio, methods=['GET'])
app.add_url_rule('/api/index.py/portfolio/trade', view_func=trade, methods=['POST'])
app.add_url_rule('/api/index.py/market/tickers', view_func=market_tickers, methods=['GET'])
app.add_url_rule('/api/index.py/predict', view_func=predict, methods=['GET'])
app.add_url_rule('/api/index.py/cloudinary/signature', view_func=cloudinary_signature, methods=['GET'])
