//Work plan- npm init -y, npm i express, write server including "/", "/contact", "about" endopints, nodemon app.js.
import express from "express";
import bodyParser from "body-parser"; // Middleware
import ejs from "ejs";
import _ from "lodash";
import nodemailer from "nodemailer";
import path from "path";
import Swal from 'sweetalert2/dist/sweetalert2.all.min.js';
import serverless from 'serverless-http';
import pg from "pg";
import dotenv from 'dotenv';
import multer from "multer";

const homeStartingContent = "Hi Everyone.";
const aboutTitle = "About Me"; 
const contactTitle = "Contact";
const notification = "";

/*
Creating the application structure, including routes, views, and static files.
Setting up the Express.js server and defining the necessary routes.
*/

// Express.js server:
const app = express();
const port = process.env.PORT || 3000; // Use the PORT provided by the environment or default to 3000

dotenv.config();

app.set('view engine', 'ejs');

// Add this function before db connection
async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(200) NOT NULL,
        title VARCHAR(300) NOT NULL,
        content VARCHAR(1000) NOT NULL
      )
    `);

    // Check if table is empty
    const result = await db.query("SELECT COUNT(*) FROM posts");
    if (result.rows[0].count === '0') {
      // Insert sample data
      await db.query(`
        INSERT INTO posts (subject, title, content) VALUES
        ('Fitness', 'How to get fit', 'Eat healthy and exercise'),
        ('Technology', 'Learning to Code', 'Start with the basics and practice daily'),
        ('Travel', 'Visit Vietnam', 'Amazing culture and delicious food')
      `);
      console.log('Sample data inserted successfully');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL
});
db.connect()
  .then(() => {
    console.log('Database connected successfully');
    return initializeDatabase();
  })
  .catch(err => console.error('Database connection error:', err));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
// Server static files
app.use(express.static("public"));

let posts = [
  { id: 1, subject: "Fitness", title: "How to get fit", content: "Eat healthy and exercise" }];


// defining the necessary routes:

// the client ask for a reaource- the homepage.
app.get("/", async function(req, res){
  try {
  const result = await db.query("SELECT * FROM posts ORDER BY id ASC");
  posts = result.rows;

  res.render("home", {
    startingContent: homeStartingContent, 
    posts: posts, // Pass the posts array to home.ejs
    });
  } catch (err) {
    console.log(err);
  }
});

// GET ABOUT:
app.get("/about", function(req, res){
  res.render("about", {aboutTitle: aboutTitle});  // render the about page and pass the aboutContent variable to it
});

// GET contact:
app.get("/contact", function(req, res){
  res.render("contact", {contactTitle: contactTitle, notification: notification});  // render the contact page and pass the contactContent variable to it 
});




// Multer configuration for handling file uploads
const upload = multer({ dest: 'uploads/' }); // Set the destination folder where uploaded files will be stored



// GET and POST compose (put togheter):
app.get("/compose", async function(req, res){
  res.render("compose");
});
app.post("/compose", async function(req, res){
  try {
    await db.query("INSERT INTO posts (subject, title, content) VALUES ($1, $2, $3)", [req.body.postSubject, req.body.postTitle, req.body.postBody]);
    const post = {subject:req.body.postSubject, title: req.body.postTitle, content: req.body.postBody};
    posts.push(post);   
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});





// When a user clicks on a post, the app should display the post's subject, title, and content on a new page (post.ejs).
//  The ":postName" part in the route is a route parameter, and it allows to capture the value specified in the URL.
app.get("/posts/:postName", function(req, res){
  const requestedTitle = _.lowerCase(req.params.postName);

  posts.forEach (function (post){
    const storedTitle = _.lowerCase(post.title);    //converts to lowercase 
    if (storedTitle === requestedTitle) {     // checks if the stored title matches the requested title
            res.render("post", {subject: post.subject, title: post.title, content: post.content});    //If there is a match, it renders the "post" template, passing information about the post (subject, title, content) to be displayed.
    }
  });
});




// GET route to render the edit form for a specific post
app.get("/edit/:postName", async function (req, res) {
  try {
    const requestedTitle = req.params.postName;
    const result = await db.query("SELECT * FROM posts WHERE LOWER(title) = LOWER($1)", [requestedTitle]);
    const post = result.rows[0];

    if (!post) {
      return res.status(404).send("Post not found");
    }
    res.render("edit", { post: post });
  } catch (err) {
    console.error("Error fetching post for edit:", err);
    res.status(500).send("Error fetching post for edit");
  }
});

// POST route to handle updating a post in the database
app.post("/edit/:postName", async function (req, res) {
  try {
    const requestedTitle = req.params.postName;
    const result = await db.query(
      "UPDATE posts SET subject = $1, title = $2, content = $3 WHERE LOWER(title) = LOWER($4) RETURNING *",
      [req.body.postSubject, req.body.postTitle, req.body.postBody, requestedTitle]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Post not found");
    }
    res.redirect("/posts/" + _.lowerCase(req.body.postTitle));
  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).send("Error updating post");
  }
});

// Delete post route - handle post deletion
app.get("/delete/:postName", async function (req, res) {
  const requestedTitle = req.params.postName; // Remove _.lowerCase here
  try {
    const result = await db.query("DELETE FROM posts WHERE LOWER(title) = LOWER($1)", [requestedTitle]);
    if (result.rowCount === 0) {
      console.log(`No post found with title: ${requestedTitle}`);
      return res.status(404).send("Post not found");
    }
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting post");
  }
});




// POST request for handling the form submission
app.post("/contact", function (req, res) {
  // Extract form data
  const name = req.body.name;
  const email = req.body.email;
  const inquiry = req.body.inquiry;
  const message = req.body.message;

  // Nodemailer configuration
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "shanibider@gmail.com", // 
      pass: "frbl yjwk gqvd prwa", // "App Password"- generated app password (provided by gmail)
    },
  });

  // Function to format camel case words with spaces
function formatInquiry(inquiry) {
  return inquiry.replace(/([a-z])([A-Z])/g, '$1 $2');
}

  // Email options
  const mailOptions = {
    from: email,
    to: "shanibider@gmail.com",
    subject: `New Message from ${name}`,
    text: `Inquiry: ${formatInquiry(inquiry)} \n\n\n ${message} \n\n Email sent from: ${email}`,
  };


  // Send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
      res.redirect("/contact?notification=Error: Unable to send the message.");      
    } else {
      console.log("Email sent: " + info.response);
    
     // Show SweetAlert for success
     const successNotification = 'Email sent successfully!';
     res.render("contact", { contactContent: contactContent, notification: successNotification });
     res.redirect("/"); // Redirect to home page

    }
  });
});




app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});




// Export the app object. This is required for the serverless function.
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello from Express.js!' });
}
);
app.use('/.netlify/functions/app', router);  // path must route to lambda

export const handler = serverless(app);

