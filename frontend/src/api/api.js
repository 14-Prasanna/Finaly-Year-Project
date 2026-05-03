import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  withCredentials: true, // 🔥 important for Flask session cookies
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
