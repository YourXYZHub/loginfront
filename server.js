const express = require('express');
const cors = require('cors');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta de health check para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generar mensaje para firmar
app.get('/api/nonce', (req, res) => {
  const nonce = Math.random().toString(36).substring(2, 15);
  const message = `Login request - Nonce: ${nonce} - Time: ${Date.now()}`;
  res.json({ message, nonce });
});

// Verificar firma y usuario
app.post('/api/verify', async (req, res) => {
  try {
    const { publicKey, signature, message } = req.body;

    // Verificar firma
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Firma inválida' });
    }

    // Buscar usuario en Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet', publicKey)
      .single();

    if (error || !user) {
      return res.json({ registered: false });
    }

    res.json({
      registered: true,
      profile: user
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Manejar todas las rutas no definidas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});