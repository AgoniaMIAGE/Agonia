const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve images from the "sprites" directory
app.use('/sprites', express.static(path.join(__dirname, 'sprites')));

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "/dist/index.html"));
});

// necessary for heroku, as heroku will position the PORT environment variable
let port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log("Server is running on port " + port);
});
