# My Tech Stack

# Frontend
- React with Expo
- Axios for API requests

# Backend
- FastAPI
- Pydantic for data validation
- libsql_client for database connections (Turso)
- Uvicorn as ASGI server

# Setup and Installation
Backend
# Clone the repository
git clone [repository-url]

# Navigate to the backend directory
cd [project-directory]/backend

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Frontend
# Navigate to the frontend directory
cd [project-directory]/frontend

# Install dependencies
npm install

# Start the Expo development server
expo start

## API Endpoints
GET /drivers/{driver_id}/trip-history
- Fetches trip history for a specific driver
- Optional query parameter: date (YYYY-MM-DD)

## Database
The project uses a Turso database. Ensure you have the correct DB_URL and AUTH_TOKEN in the environment variables.
