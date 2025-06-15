# Mini Delivery Management App

A modern delivery management system that allows customers to place delivery orders and delivery personnel to view and update their delivery tasks. Built with React, Express, Socket.IO, and Leaflet Maps integration.

## 🚀 Features

### Customer Features

- **Account Management**: Register and login as a customer
- **Order Creation**: Place delivery requests with pickup and drop-off addresses
- **Address Input**: Leaflet Maps integration with OpenStreetMap for accurate address selection
- **Real-time Tracking**: Track order status in real-time
- **Order History**: View all placed orders with detailed status

### Delivery Personnel Features

- **Dashboard**: View assigned delivery tasks
- **Status Updates**: Update order status (Picked Up, Delivered)
- **GPS Integration**: Real-time location tracking during deliveries
- **Navigation**: Get directions using OpenStreetMap
- **Real-time Notifications**: Receive new assignments instantly

### Admin Features

- **Order Management**: View all orders in the system
- **Assignment**: Assign delivery personnel to pending orders
- **Analytics**: Overview of system performance and statistics
- **Personnel Management**: View registered delivery personnel
- **Real-time Monitoring**: Monitor all deliveries in real-time

### Technical Features

- **Real-time Updates**: WebSocket-based live updates
- **Map Integration**: Leaflet Maps with OpenStreetMap for address selection and tracking
- **Responsive Design**: Modern, mobile-friendly interface
- **Authentication**: JWT-based secure authentication
- **API-first**: RESTful API with comprehensive endpoints

## 🛠 Tech Stack

### Frontend

- **React 19** - Modern UI library
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Leaflet** - Open-source maps and geocoding
- **React Leaflet** - React components for Leaflet
- **React Hot Toast** - Notifications
- **Framer Motion** - Animations

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **UUID** - Unique identifiers

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd mini-delivery
\`\`\`

### 2. Install Dependencies

#### Frontend Dependencies

\`\`\`bash
npm install
\`\`\`

#### Backend Dependencies

\`\`\`bash
cd server
npm install
cd ..
\`\`\`

### 3. Environment Setup

#### Frontend Environment

Create \`.env\` file in the root directory:
\`\`\`env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_MAP_PROVIDER=openstreetmap
VITE_NODE_ENV=development
\`\`\`

#### Backend Environment

Create \`server/.env\` file:
\`\`\`env
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
\`\`\`

### 4. Start the Application

#### Start Backend Server

\`\`\`bash
cd server
npm run dev

# or

npm start
\`\`\`

#### Start Frontend (in a new terminal)

\`\`\`bash
npm run dev
\`\`\`

### 5. Access the Application

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

## 🗺 Maps Integration

This application uses **Leaflet** with **OpenStreetMap** for mapping functionality:

- **No API Key Required**: OpenStreetMap is free and open-source
- **Address Autocomplete**: Using Nominatim geocoding service
- **Real-time Tracking**: GPS location tracking during deliveries
- **Route Directions**: Integration with OpenStreetMap routing

### Map Features

- Interactive maps for address selection
- Real-time location tracking
- Route calculation and directions
- Geocoding and reverse geocoding
- No usage limits or API costs

## 🎯 User Roles & Demo Accounts

### Creating Demo Accounts

You can register new accounts through the app, or create them directly:

#### Customer Account

- Role: Customer
- Features: Place orders, track deliveries

#### Delivery Personnel Account

- Role: Delivery
- Features: View assignments, update status

#### Admin Account

- Role: Admin
- Features: Manage orders, assign personnel

## 📱 Usage Guide

### For Customers

1. **Register/Login** with role "Customer"
2. **Place Order** by clicking "New Order"
3. **Enter Addresses** using the map-integrated inputs
4. **Track Progress** in real-time on your dashboard
5. **View History** of all your orders

### For Delivery Personnel

1. **Register/Login** with role "Delivery"
2. **View Assignments** on your dashboard
3. **Update Status** as you pick up and deliver items
4. **Use Navigation** to get directions via OpenStreetMap
5. **Track Earnings** and performance

### For Admins

1. **Register/Login** with role "Admin"
2. **Monitor Orders** in real-time
3. **Assign Orders** to available delivery personnel
4. **View Analytics** and system statistics
5. **Manage Personnel** and system performance

## 🔧 Development

### Available Scripts

#### Frontend

\`\`\`bash
npm run dev # Start development server
npm run build # Build for production
npm run preview # Preview production build
npm run lint # Run ESLint
\`\`\`

#### Backend

\`\`\`bash
npm start # Start production server
npm run dev # Start development server with auto-reload
\`\`\`

### Project Structure

\`\`\`
mini-delivery/
├── src/ # Frontend source
│ ├── components/ # Reusable components
│ ├── contexts/ # React contexts
│ ├── pages/ # Page components
│ ├── services/ # API & external services
│ └── ...
├── server/ # Backend source
│ ├── routes/ # API routes
│ ├── middleware/ # Express middleware
│ ├── utils/ # Utilities
│ └── ...
└── ...
\`\`\`

## 🌐 API Endpoints

### Authentication

- \`POST /api/auth/register\` - Register new user
- \`POST /api/auth/login\` - Login user
- \`POST /api/auth/verify\` - Verify JWT token

### Orders

- \`GET /api/orders\` - Get user's orders
- \`POST /api/orders\` - Create new order
- \`PUT /api/orders/:id/assign\` - Assign order (admin)
- \`PUT /api/orders/:id/status\` - Update status (delivery)

### Users

- \`GET /api/users/profile\` - Get user profile
- \`PUT /api/users/profile\` - Update profile
- \`GET /api/users/delivery-personnel\` - Get delivery personnel (admin)
- \`GET /api/users/stats\` - Get user statistics

## 🔄 Real-time Features

The app uses WebSocket connections for:

- **Order Updates**: Real-time status changes
- **Notifications**: Instant alerts for new orders/assignments
- **Location Tracking**: Live delivery personnel location
- **Admin Monitoring**: Real-time system overview

## 🎨 UI/UX Features

- **Responsive Design**: Works on all device sizes
- **Modern Interface**: Clean, intuitive design
- **Real-time Updates**: Live data without page refreshes
- **Interactive Maps**: Google Maps integration
- **Toast Notifications**: User-friendly feedback
- **Loading States**: Smooth user experience
- **Error Handling**: Graceful error management

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **Role-based Access**: Different permissions per role
- **CORS Protection**: Configured cross-origin policies
- **Input Validation**: Server-side validation

## 🚀 Production Deployment

### Environment Variables

Set production values for:

- \`JWT_SECRET\` - Strong, unique secret
- \`NODE_ENV=production\`
- \`CLIENT_URL\` - Your frontend domain
- API keys and database URLs

### Build Commands

\`\`\`bash

# Frontend

npm run build

# Backend

npm start
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the documentation
2. Search existing issues
3. Create a new issue with details

## 🎯 Future Enhancements

- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Advanced routing optimization
- [ ] Customer rating system
- [ ] Delivery cost calculation

---

Built with ❤️ for efficient delivery management.
