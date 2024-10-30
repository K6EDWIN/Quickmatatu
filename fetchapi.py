from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from libsql_client import connect
import os

# Initialize FastAPI app
app = FastAPI()

# Turso Database URL and Token
DB_URL = "libsql://quickmatatu-kairo.turso.io"
AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Mjk5MzI4MDYsImlkIjoiOGU1MTBlMjktNDAyMi00NGVlLWE1NjQtNzkwZmY0OWUyN2ZhIn0.KNiMSvgaL7hFflIfOGI915-qYBNw2CnOAnTIc7RBeWYdTZKb_5xlIagY0oefm2mWJnKQxJXtpQnmRuugwk6dAQ"

# Database connection function
def get_db_connection():
    """Establishes a connection to the database."""
    return connect(DB_URL, auth_token=AUTH_TOKEN)

# Models
class Trip(BaseModel):
    id: int
    driver_id: int
    date: str  # ISO format string (e.g., "2023-10-25T14:30:00")
    route: str
    status: str  # Added status field for alignment with frontend

# Route to get trip history for a specific driver
@app.get("/drivers/{driver_id}/trip-history", response_model=List[Trip])
def get_trip_history(driver_id: int):
    """Retrieve trip history for a specific driver."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        """
        SELECT id, driver_id, date, route, 'completed' AS status 
        FROM trip_history 
        WHERE driver_id = ?
        """,
        (driver_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {"id": row[0], "driver_id": row[1], "date": row[2], "route": row[3], "status": row[4]}
        for row in rows
    ]
