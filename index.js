let express = require('express');
let app = express();

app.use("/", express.static(__dirname));

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/dist/index.html");
});

// necessary for heroku, as heroku will position the PORT environment variable
let port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log("Server is running on port " + port);
});