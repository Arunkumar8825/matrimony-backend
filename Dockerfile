{
  "name": "yadhavar-matrimony-backend",
  "version": "1.0.0",
  "description": "Backend for Yadhavar Matrimony Platform",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "seed:admin": "node src/seeds/adminSeeder.js",
    "seed:users": "node src/seeds/userSeeder.js",
    "docker:build": "docker build -t yadhavar-matrimony .",
    "docker:run": "docker run -p 5000:5000 --env-file .env yadhavar-matrimony",
    "docker:dev": "docker-compose up",
    "docker:stop": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "setup": "npm install && copy .env.example .env",
    "init": "npm run seed:admin && npm run seed:users"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.37.3",
    "nodemailer": "^6.9.1",
    "socket.io": "^4.6.1",
    "express-validator": "^6.15.0",
    "express-rate-limit": "^6.10.0",
    "helmet": "^7.0.0",
    "xss-clean": "^0.1.4",
    "moment": "^2.29.4",
    "razorpay": "^2.8.6",
    "twilio": "^4.13.0",
    "axios": "^1.4.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}