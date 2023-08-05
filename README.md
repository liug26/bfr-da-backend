# BFR Data Analysis Website (Backend)
- Creates an API for frontend to upload and manage the car's run logs (later abbreviated as "data") stored in a MongoDB database:  
   Post data request -> backend uploads data to database & updates master file in the database  
   Delete data request -> backend deletes data from database & updates master file in the database
- Generates real-time customizable time-series graphs and passes to frontend:    
   Get plot request -> backend gets parameters from query -> sends params to a python script -> python script writes HTML to a temporary local file -> backend reads the local file and sends back to frontend
- Ask the master file in the database for a hierarchical list of all existing data:  
   Get datatree request -> backend fetches master file from database -> converts it to a tree-structured JSON and sends back to frontend
