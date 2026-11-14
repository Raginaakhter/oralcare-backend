# OralCare Backend

Node.js, Express & TypeScript backend for the OralCare application with MongoDB & Mongoose.

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Edit `.env` and replace `<CLUSTER_HOST>` with your MongoDB Atlas cluster host (e.g., `cluster0.abcde.mongodb.net`):
```env
MONGODB_URI=mongodb+srv://oralcare:PYXNLKkE3a5nqCq@<CLUSTER_HOST>/oralcare?retryWrites=true&w=majority
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build & Production
```bash
npm run build
npm start
```

## 📡 API Endpoints
- `GET /` - Root welcoming route
- `GET /api/v1/health` - Health check & MongoDB connection status
- `GET /api/v1/products` - List all products (supports `?category=`, `?brand=`, `?search=`)
- `GET /api/v1/products/:slug` - Get single product details
- `POST /api/v1/products` - Create a new product

