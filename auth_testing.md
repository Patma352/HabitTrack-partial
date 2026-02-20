# Auth Testing Playbook

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  coins: 100,
  is_admin: false,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
db.habit_goals.insertOne({
  user_id: userId,
  steps_goal: 10000,
  water_goal: 8,
  sleep_goal: 8.0,
  calories_goal: 500,
  updated_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
# Test auth endpoint
curl -X GET "https://goal-coins-2.preview.emergentagent.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test habits today
curl -X GET "https://goal-coins-2.preview.emergentagent.com/api/habits/today" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test log habit
curl -X POST "https://goal-coins-2.preview.emergentagent.com/api/habits/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"habit_type": "water", "value": 1}'

# Test coins balance
curl -X GET "https://goal-coins-2.preview.emergentagent.com/api/coins" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test products
curl -X GET "https://goal-coins-2.preview.emergentagent.com/api/products"
```

## Step 3: Browser Testing (Playwright)
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "goal-coins-2.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://goal-coins-2.preview.emergentagent.com")
```

## Checklist
- [ ] User document has user_id field
- [ ] Session user_id matches user's user_id
- [ ] All queries use {"_id": 0} projection
- [ ] /api/auth/me returns user data
- [ ] Habit logging works and coins are awarded
- [ ] Products load from shop
- [ ] Order creation deducts coins
