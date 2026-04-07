# Accident Reporting System

A comprehensive web application for reporting accidents, managing emergency responses, and providing analytics for road safety.

## Features

- **User Registration & Authentication**: Secure login for citizens and admins.
- **Accident Reporting**: Submit accident details with GPS location, photos, and severity levels.
- **Real-Time Notifications**: Alerts to emergency services via SMS/email.
- **Admin Dashboard**: Manage reports, view analytics, and update statuses.
- **Data Analytics**: Insights into accident patterns and hotspots.
- **Integrations**: Google Maps for location services, Twilio for SMS notifications.

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React.js (with Vite)
- **Database**: SQLite
- **Authentication**: JWT tokens
- **APIs**: Google Maps, Twilio

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- Git

### Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server:
   - `python -m uvicorn main:app --reload --port 8000`
   - API will be available at `http://localhost:8000`

> If you change the data models (e.g., add fields), delete `backend/accident_reporting.db` before restarting the server so the SQLite schema is recreated.

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
   - App will be available at `http://localhost:5173`

### Database
- SQLite database is created automatically on first run.
- Tables: users, accidents, reports, emergency_contacts

## API Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login
- `POST /accidents/report` - Report an accident
- `GET /accidents/` - Get all accidents (admin)
- `GET /admin/dashboard` - Admin dashboard data

## Usage

1. Register/Login as a citizen or admin.
2. Citizens can report accidents with location and details.
3. Admins can view and manage reports.
4. Notifications are sent automatically.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit changes.
4. Push and create a pull request.

## License

This project is licensed under the MIT License.