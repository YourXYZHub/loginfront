document.addEventListener('DOMContentLoaded', async () => {
    const connectButton = document.getElementById('connect-wallet');
    const signMessageButton = document.getElementById('sign-message');
    const walletStatus = document.getElementById('wallet-status');
    const loginSection = document.getElementById('login-section');
    const userStatus = document.getElementById('user-status');
    const registrationStatus = document.getElementById('registration-status');
    const profileInfo = document.getElementById('profile-info');
    
    let publicKey = null;
    let provider = null;

    // Check if Phantom is installed
    if ('solana' in window) {
        provider = window.solana;
    } else {
        window.open('https://phantom.app/', '_blank');
        connectButton.disabled = true;
        connectButton.textContent = 'Instala Phantom';
        walletStatus.innerHTML = '<p>Phantom Wallet no detectada. <a href="https://phantom.app/" target="_blank">Instalar</a></p>';
    }

    // Connect to Phantom Wallet
    connectButton.addEventListener('click', async () => {
        try {
            const response = await provider.connect();
            publicKey = response.publicKey.toString();
            
            walletStatus.innerHTML = `<p>Wallet conectada: ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}</p>`;
            loginSection.classList.remove('hidden');
            connectButton.textContent = 'Wallet Conectada';
            connectButton.disabled = true;
            
        } catch (err) {
            console.error('Error connecting to wallet:', err);
            walletStatus.innerHTML = '<p>Error conectando la wallet</p>';
        }
    });

    // Sign message and verify
    signMessageButton.addEventListener('click', async () => {
        if (!publicKey) {
            alert('Primero conecta tu wallet');
            return;
        }

        try {
            // Get message from backend
            const nonceResponse = await fetch('http://localhost:3001/api/nonce');
            const { message } = await nonceResponse.json();
            
            // Request signature from Phantom
            const encodedMessage = new TextEncoder().encode(message);
            const { signature } = await provider.signMessage(encodedMessage, 'utf8');
            
            // Convert signature to base58
            const signatureBase58 = bs58.encode(signature);
            
            // Send to backend for verification
            const verifyResponse = await fetch('http://localhost:3001/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicKey,
                    signature: signatureBase58,
                    message
                }),
            });
            
            const result = await verifyResponse.json();
            
            // Display results
            userStatus.classList.remove('hidden');
            
            if (result.registered) {
                registrationStatus.textContent = 'REGISTRADO';
                registrationStatus.style.color = 'green';
                
                // Display profile info
                document.getElementById('profile-id').textContent = result.profile.id;
                document.getElementById('profile-name').textContent = result.profile.name || 'N/A';
                document.getElementById('profile-handle').textContent = result.profile.handle || 'N/A';
                document.getElementById('profile-image').textContent = result.profile.image_url ? 'Sí' : 'No';
                document.getElementById('profile-created').textContent = new Date(result.profile.created_at).toLocaleString();
                
                profileInfo.classList.remove('hidden');
            } else {
                registrationStatus.textContent = 'NO REGISTRADO';
                registrationStatus.style.color = 'red';
                profileInfo.classList.add('hidden');
            }
            
        } catch (err) {
            console.error('Error during signing:', err);
            alert('Error durante la firma del mensaje');
        }
    });
});
