import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Make sure to update your .env file to use GNEWS_API_KEY
    const API_KEY = process.env.GNEWS_API_KEY;
    
    // Updated to the GNews v4 search endpoint
    const response = await axios.get("https://gnews.io/api/v4/search", {
      params: {
        // GNews fully supports your Boolean query operators
        q: 'Pakistan AND (court OR law OR legal OR judiciary OR "Supreme Court" OR "High Court" OR "Chief Justice" OR constitution OR parliament OR senate OR election OR politics OR PTI OR PMLN OR PPP)',
        lang: 'en', // Changed from 'language'
        max: 10,    // Changed from 'pageSize' (Note: GNews free tier allows a maximum of 10)
        apikey: API_KEY // Changed from 'apiKey' (GNews uses all lowercase 'apikey')
      }
    });
    
    // GNews conveniently returns the array in an 'articles' property, just like NewsAPI!
    res.json(response.data.articles);
  } catch (error) {
    // Enhanced error logging
    console.error("Error fetching news:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to fetch legal news" });
  }
});

export default router;