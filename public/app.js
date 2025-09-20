// Variables globales
let publicKey = null;
let provider = window.solana;

// Elementos del DOM
const connectBtn = document.getElementById('connect-btn');
const loginBtn = document.getElementById('login-btn');
const walletStatus = document.getElementById('wallet-status');
const loginSection = document.getElementById('login-section');
const resultSection = document.getElementById('result');
const statusText = document.getElementById('status-text');
const profileInfo = document.getElementById('profile-info');
const userName = document.getElementById('user-name');
const userHandle = document.getElementById('user-handle');
const userId = document.getElementById('user-id');
const userImage = document.getElementById('user-image');
const userCreated = document.getElementById('user-created');

// Verificar si Phantom está instalado
if (!provider) {
    connectBtn.disabled = true;
    connectBtn.textContent = 'Instalar Phantom';
    walletStatus.innerHTML = '<p class="error">Phantom no detectado. <a href="https://phantom.app/" target="_blank">Instalar Phantom Wallet</a></p>';
} else {
    // Verificar si ya está conectado
    provider.connect({ onlyIfTrusted: true })
        .then(({ publicKey }) => {
            setConnectedWallet(publicKey.toString());
        })
        .catch(() => {
            // No estaba conectado previamente, es normal
        });
}

// Función para establecer wallet conectada
function setConnectedWallet(walletAddress) {
    publicKey = walletAddress;
    walletStatus.innerHTML = `<p class="success">Conectado: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}</p>`;
    loginSection.style.display = 'block';
    connectBtn.textContent = 'Conectado';
    connectBtn.disabled = true;
}

// Conectar wallet
connectBtn.addEventListener('click', async () => {
    try {
        if (!provider) {
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        const response = await provider.connect();
        setConnectedWallet(response.publicKey.toString());
    } catch (error) {
        walletStatus.innerHTML = '<p class="error">Error al conectar la wallet</p>';
        console.error('Error connecting wallet:', error);
    }
});

// Iniciar sesión
loginBtn.addEventListener('click', async () => {
    if (!publicKey) return;
    
    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verificando...';
        resultSection.style.display = 'block';
        statusText.textContent = 'Verificando...';
        profileInfo.style.display = 'none';
        
        // Obtener mensaje del backend
        const nonceResponse = await fetch('/api/nonce');
        if (!nonceResponse.ok) {
            throw new Error('Error al obtener nonce del servidor');
        }
        
        const { message } = await nonceResponse.json();
        
        // Firmar mensaje con Phantom
        const encodedMessage = new TextEncoder().encode(message);
        const { signature } = await provider.signMessage(encodedMessage, 'utf8');
        
        // Enviar al backend para verificación
        const verifyResponse = await fetch('/api/verify', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                publicKey,
                signature: bs58.encode(signature),
                message
            })
        });
        
        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.error || 'Error en verificación');
        }
        
        const result = await verifyResponse.json();
        
        if (result.registered) {
            statusText.innerHTML = '<span class="success">✅ REGISTRADO</span>';
            userName.textContent = result.profile.name || 'No especificado';
            userHandle.textContent = result.profile.handle || 'No especificado';
            userId.textContent = result.profile.id || 'N/A';
            userImage.innerHTML = result.profile.image_url 
                ? `<img src="${result.profile.image_url}" alt="Avatar" style="max-width: 100px; border-radius: 50%;">` 
                : 'No disponible';
            userCreated.textContent = new Date(result.profile.created_at).toLocaleDateString();
            profileInfo.style.display = 'block';
        } else {
            statusText.innerHTML = '<span class="error">❌ NO REGISTRADO</span>';
            profileInfo.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        statusText.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        profileInfo.style.display = 'none';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
    }
});