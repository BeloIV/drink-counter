# Drink Counter 🍺☕

Modern web application for tracking beverage consumption and managing debts in households or shared spaces. Built with Django REST Framework backend and React frontend, orchestrated with Docker Compose.

## ✨ Features

- 📊 **Consumption Tracking** - Track beers, coffees, and other beverages
- 👥 **Person Management** - Home members and guests
- 💰 **Automatic Debt Calculation** - Per-item or per-gram pricing
- 📱 **Responsive Design** - Optimized for mobile and desktop
- 🔄 **Multi-select Mode** - Add transactions for multiple people at once
- 🎨 **Modern UI** - Bootstrap 5 with custom CSS enhancements
- 🔐 **Admin Panel** - Manage items, persons, and transactions

## 🚀 Technologies

### Backend
- Django 5.1.4
- Django REST Framework
- PostgreSQL 16
- Python 3.12

### Frontend
- React 18
- Vite
- React Router
- Bootstrap 5
- React Icons

### DevOps
- Docker & Docker Compose
- Multi-stage builds
- Hot reload in dev mode

## 📦 Installation & Setup

### Prerequisites
- Docker
- Docker Compose
- Git

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/BeloIV/drink-counter.git
cd drink-counter
```

2. **Start the application**
```bash
docker compose up --build
```

3. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Admin panel: http://localhost:8000/admin

4. **Create a superuser (for admin panel)**
```bash
docker compose exec backend python manage.py createsuperuser
```

## 📁 Project Structure

```
drink-counter/
├── backend/              # Django REST API
│   ├── backend/         # Project settings
│   ├── core/           # Main app (models, views, serializers)
│   ├── manage.py
│   └── requirements.txt
├── frontend/            # React application
│   ├── src/
│   │   ├── pages/      # Pages (admin)
│   │   ├── assets/     # Images, avatars
│   │   ├── App.jsx     # Main component
│   │   └── api.js      # API client
│   ├── public/
│   └── package.json
├── docker-compose.yaml  # Service orchestration
└── README.md
```

## 🎯 Usage

### Adding a transaction (single mode)
1. Select a person from home members or guests
2. Choose category (Beer/Coffee)
3. Select specific beverage
4. For coffee, enter gram amount
5. Debt is automatically added

### Adding a transaction (multi mode)
1. Activate "Multiple people" button
2. Select multiple persons
3. Click "Continue"
4. Choose category and beverage
5. For coffee, grams are evenly distributed

### Admin panel
- Add/edit items
- Manage persons
- View all transactions
- Close/open sessions
- Pay-by-square QR codes

## 🛠️ Development

### Backend development
```bash
# Access backend container
docker compose exec backend bash

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Run tests
python manage.py test
```

### Frontend development
```bash
# Access frontend container
docker compose exec frontend sh

# Install new dependencies
npm install <package>
```

### Hot reload
Both containers have hot reload configured - changes are reflected automatically.

## 📝 API Endpoints

- `GET /api/persons/` - List persons
- `POST /api/persons/` - Create person
- `GET /api/items/` - List items
- `POST /api/transactions/` - Add transaction
- `GET /api/session/active/` - Active session with summary
- `POST /api/session/close/` - Close session

## 🔧 Configuration

### Backend (.env or docker-compose.yaml)
```env
POSTGRES_DB=drinkdb
POSTGRES_USER=drinkuser
POSTGRES_PASSWORD=drinkpass
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

### Frontend (src/config.js)
```javascript
export const API_BASE = 'http://localhost:8000/api'
```

## 📊 Database Models

- **Person** - Home members and guests
- **Category** - Beverage categories (Beer, Coffee)
- **Item** - Specific beverages (price, pricing mode)
- **Session** - Tracking periods
- **Transaction** - Individual consumption records

## 🎨 UI Features

- Person avatars with overlay effect
- Fixed button when scrolling
- Visual checkmarks for multi-person selection
- Progress stepper
- Notice notifications
- Responsive grid layout

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change port in docker-compose.yaml
ports:
  - "5174:5173"  # frontend
  - "8001:8000"  # backend
```

**Database won't start:**
```bash
docker compose down -v  # Delete volumes
docker compose up --build
```

**Changes not reflected:**
```bash
docker compose up --build --force-recreate
```

## 📄 License

MIT

## 👨‍💻 Author

Created by: BeloIV

---

⭐ If you like this project, give it a star on GitHub!