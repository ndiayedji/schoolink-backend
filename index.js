const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:3000' })); // Autorise localhost pour les tests locaux
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/schoolink')
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.error('Erreur de connexion à MongoDB:', err));

// Initialisation de Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : require('./config/schoolink-firebase-adminsdk-abc123.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const User = require('./models/User');
const Performance = require('./models/Performance');

// Création du serveur HTTP
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('Utilisateur connecté:', socket.id);
  socket.on('sendMessage', (data) => {
    io.emit('receiveMessage', data);
    const Message = mongoose.model('Message', new mongoose.Schema({
      senderId: String,
      receiverId: String,
      content: String,
      timestamp: { type: Date, default: Date.now },
    }));
    new Message(data).save().catch(err => console.error('Erreur sauvegarde message:', err));
  });
  socket.on('disconnect', () => console.log('Utilisateur déconnecté:', socket.id));
});

// Routes existantes (inchangées pour cet exemple)
app.post('/save-token', async (req, res) => {
  const { token, userId } = req.body;
  console.log('Requête reçue pour sauvegarder le token:', token, userId);
  try {
    await User.findOneAndUpdate(
      { userId },
      { fcmToken: token },
      { upsert: true }
    );
    res.status(200).send('Token sauvegardé');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/send-notification', async (req, res) => {
  const { userId, title, body } = req.body;
  try {
    console.log('Recherche de l\'utilisateur:', userId);
    const user = await User.findOne({ userId });
    if (!user || !user.fcmToken) {
      return res.status(404).send('Utilisateur ou token non trouvé');
    }
    console.log('Envoi de la notification avec token:', user.fcmToken);
    const message = {
      notification: {
        title: title || 'Notification Schoolink',
        body: body || 'Vous avez une nouvelle mise à jour !',
      },
      token: user.fcmToken,
    };
    const response = await admin.messaging().send(message);
    console.log('Notification envoyée:', response);
    res.status(200).send('Notification envoyée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    res.status(500).send('Erreur lors de l\'envoi');
  }
});

app.post('/add-performance', async (req, res) => {
  const { userId, subject, grade, teacherId } = req.body;
  try {
    const performance = new Performance({ userId, subject, grade, teacherId });
    await performance.save();
    res.status(201).send('Performance enregistrée');
  } catch (error) {
    console.error('Erreur lors de l’enregistrement de la performance:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/performance/:userId', async (req, res) => {
  try {
    const performances = await Performance.find({ userId: req.params.userId });
    res.json(performances);
  } catch (error) {
    console.error('Erreur lors de la récupération des performances:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/generate-resource', async (req, res) => {
  const { subject, grade, userId } = req.body;
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Génère une fiche pédagogique simple sur ${subject} pour un élève avec une note de ${grade}/20, en français, adapté au système éducatif sénégalais (niveau primaire ou secondaire selon le contexte). Inclut des exercices interactifs simples.`
        }],
      },
      {
        headers: {
          'Authorization': `Bearer votre-api-key-openai`, // Remplacez par votre clé API OpenAI
          'Content-Type': 'application/json',
        },
      }
    );
    res.json({ resource: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Erreur lors de la génération de la ressource:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/', (req, res) => {
  res.send('API Schoolink en ligne');
});

// Démarrez le serveur sur le port 5000 pour les tests locaux
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('Serveur démarré sur le port', PORT);
});