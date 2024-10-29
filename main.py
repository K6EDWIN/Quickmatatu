import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from libsql_client import create_client_sync

# Initialize FastAPI app
app = FastAPI()

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Database configuration
DB_URL = "libsql://quickmatatu-kairo.turso.io"
AUTH_TOKEN = (
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MzAxMDUyNjEsImlkIjoiOGU1MTBlMjktNDAyMi00NGVlLWE1NjQtNzkwZmY0OWUyN2ZhIn0.T7KIj6MkpE3z5_JQzNhBDntc7YaZnC2hEPFPuHs5X1DTBwMD6GyYy5mhlj40ZFqGU2u9XIBrmMQ6-geK-q62AQ"
)

def get_db_connection():
    """Establish a synchronous database connection."""
    try:
        conn = create_client_sync(DB_URL, auth_token=AUTH_TOKEN)
        logging.info("Database connection established successfully.")
        return conn
    except Exception as e:
        logging.error(f"Database connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect to the database.")

class Trip(BaseModel):
    id: int
    driver_id: int
    date: str
    route: str
    status: str = "unknown"

@app.get("/drivers/{driver_id}/trip-history", response_model=List[Trip])
def get_trip_history(driver_id: int, date: Optional[str] = Query(None)):
    """Fetch trip history for a specific driver, optionally filtered by date."""
    conn = get_db_connection()

    try:
        if date:
            query = """
                SELECT id, driver_id, date, route, status
                FROM trip_history
                WHERE driver_id = ? AND date = ?
            """
            params = [driver_id, date]
        else:
            query = """
                SELECT id, driver_id, date, route, status
                FROM trip_history
                WHERE driver_id = ?
            """
            params = [driver_id]

        logging.debug(f"Executing query: {query} with params: {params}")

        result_set = conn.execute(query, params)
        rows = result_set.rows

        if not rows:
            logging.warning(f"No trips found for driver {driver_id} on {date}.")
            return []

        return [
            Trip(
                id=r[0],
                driver_id=r[1],
                date=r[2],
                route=r[3],
                status=r[4] if r[4] is not None else "unknown"
            )
            for r in rows
        ]

    except Exception as e:
        logging.error(f"Database query failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Database query failed.")

    finally:
        conn.close()
        logging.info("Database connection closed.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
