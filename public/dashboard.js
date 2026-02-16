const user = JSON.parse(sessionStorage.getItem('user'));

if (!user) {
  window.location.href = '/';
} else {
  document.getElementById('username').textContent = user.username;
  document.getElementById('userId').textContent = user.id;
  loadPasskeys();
}

function showMessage(text, isError = false) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = isError ? 'error' : 'success';
  msg.style.display = 'block';
  setTimeout(() => {
    msg.style.display = 'none';
  }, 5000);
}

async function loadPasskeys() {
  try {
    const res = await fetch('/passkeys/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username })
    });
    const data = await res.json();
    
    const passkeyList = document.getElementById('passkeyList');
    if (data.passkeys && data.passkeys.length > 0) {
      passkeyList.innerHTML = data.passkeys.map((passkey, index) => `
        <div class="passkey-item">
          <div class="passkey-info">
            <strong>Passkey ${index + 1}</strong>
            <span class="passkey-details">
              ${passkey.deviceType || 'Unknown'} • 
              ${passkey.backedUp ? 'Synced' : 'Device-only'} • 
              Added: ${new Date(passkey.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
          <button onclick="deletePasskey('${passkey.id}')" class="delete-btn">Delete</button>
        </div>
      `).join('');
    } else {
      passkeyList.innerHTML = '<p class="no-passkeys">No passkeys registered</p>';
    }
  } catch (error) {
    console.error('Failed to load passkeys:', error);
  }
}

// Helper to convert base64url to Uint8Array
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper to convert Uint8Array to base64url
function uint8ArrayToBase64url(array) {
  const binary = String.fromCharCode(...array);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function addNewPasskey() {
  try {
    showMessage('Preparing to add new passkey...');
    
    const optionsRes = await fetch('/passkeys/add/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username })
    });
    const options = await optionsRes.json();

    if (options.error) {
      showMessage(options.error, true);
      return;
    }

    // Convert base64url strings to Uint8Array for WebAuthn API
    const publicKeyCredentialCreationOptions = {
      challenge: base64urlToUint8Array(options.challenge),
      rp: options.rp,
      user: {
        id: base64urlToUint8Array(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: options.excludeCredentials?.map(cred => ({
        ...cred,
        id: base64urlToUint8Array(cred.id),
      })),
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    // Convert credential response to JSON format
    const credentialJSON = {
      id: credential.id,
      rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
      response: {
        clientDataJSON: uint8ArrayToBase64url(new Uint8Array(credential.response.clientDataJSON)),
        attestationObject: uint8ArrayToBase64url(new Uint8Array(credential.response.attestationObject)),
        transports: credential.response.getTransports ? credential.response.getTransports() : [],
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: credential.authenticatorAttachment,
    };

    const verifyRes = await fetch('/passkeys/add/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, credential: credentialJSON })
    });
    const result = await verifyRes.json();

    if (result.verified) {
      showMessage('New passkey added successfully!');
      loadPasskeys();
    } else {
      showMessage('Failed to add passkey', true);
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function deletePasskey(passkeyId) {
  if (!confirm('Are you sure you want to delete this passkey?')) {
    return;
  }

  try {
    const res = await fetch('/passkeys/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, passkeyId })
    });
    const result = await res.json();

    if (result.success) {
      showMessage('Passkey deleted successfully');
      loadPasskeys();
    } else {
      showMessage(result.error, true);
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

function logout() {
  sessionStorage.removeItem('user');
  window.location.href = '/';
}
