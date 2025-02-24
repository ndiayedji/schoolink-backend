const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connexion à MongoDB sans options obsolètes
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.error('Erreur de connexion à MongoDB:', err));

const serviceAccount = require('./config/schoolink-firebase-adminsdk-abc123.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const User = require('./models/User');

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
    const user = await User.findOne({ userId });
    if (!user || !user.fcmToken) {
      return res.status(404).send('Utilisateur ou token non trouvé');
    }
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

app.get('/', (req, res) => {
  res.send('API Schoolink en ligne');
});

app.listen(5000, () => {
  console.log('Serveur démarré sur le port 5000');
});