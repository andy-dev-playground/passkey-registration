function showMessage(text, isError = false) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = isError ? 'error' : 'success';
  setTimeout(() => msg.textContent = '', 5000);
}

function showRegMessage(text, isError = false) {
  const msg = document.getElementById('registrationMessage');
  msg.textContent = text;
  msg.className = isError ? 'error' : 'success';
  setTimeout(() => msg.textContent = '', 5000);
}

let currentUsername = '';

function showRegisterModal() {
  document.getElementById('registerModal').style.display = 'block';
  document.getElementById('registrationStep1').style.display = 'block';
  document.getElementById('registrationStep2').style.display = 'none';
  document.getElementById('registrationMessage').textContent = '';
}

function closeRegisterModal() {
  document.getElementById('registerModal').style.display = 'none';
  document.getElementById('regUsername').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regMobile').value = '';
  document.getElementById('agreeTerms').checked = false;
  document.getElementById('verificationCode').value = '';
}

function showTerms() {
  document.getElementById('termsModal').style.display = 'block';
}

function closeTermsModal() {
  document.getElementById('termsModal').style.display = 'none';
}

function backToStep1() {
  document.getElementById('registrationStep1').style.display = 'block';
  document.getElementById('registrationStep2').style.display = 'none';
}

async function requestVerification() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const mobile = document.getElementById('regMobile').value.trim();
  const agreed = document.getElementById('agreeTerms').checked;

  if (!username || !email || !mobile) {
    showRegMessage('Please fill in all fields', true);
    return;
  }

  if (!agreed) {
    showRegMessage('Please agree to the Terms and Conditions', true);
    return;
  }

  try {
    const res = await fetch('/register/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, mobile })
    });
    const result = await res.json();

    if (result.success) {
      currentUsername = username;
      document.getElementById('registrationStep1').style.display = 'none';
      document.getElementById('registrationStep2').style.display = 'block';
      showRegMessage(result.message);
    } else {
      showRegMessage(result.error, true);
    }
  } catch (error) {
    showRegMessage(error.message, true);
  }
}

async function verifyCode() {
  const code = document.getElementById('verificationCode').value.trim();

  if (!code || code.length !== 6) {
    showRegMessage('Please enter a valid 6-digit code', true);
    return;
  }

  try {
    const res = await fetch('/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUsername, code })
    });
    const result = await res.json();

    if (result.verified) {
      showRegMessage('Email verified! Registering passkey...');
      await register(currentUsername);
    } else {
      showRegMessage(result.error, true);
    }
  } catch (error) {
    showRegMessage(error.message, true);
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

window.register = async function(username) {
  if (!username) {
    username = document.getElementById('username').value.trim();
  }
  
  if (!username) {
    showMessage('Please enter a username', true);
    return;
  }

  try {
    const optionsRes = await fetch('/register/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const options = await optionsRes.json();

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

    const verifyRes = await fetch('/register/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, credential: credentialJSON })
    });
    const result = await verifyRes.json();

    if (result.verified) {
      closeRegisterModal();
      showMessage('Passkey registered successfully! You can now login.');
    } else {
      showRegMessage('Registration failed', true);
    }
  } catch (error) {
    showRegMessage(error.message, true);
  }
};

window.login = async function() {
  const username = document.getElementById('username').value.trim();
  if (!username) {
    showMessage('Please enter a username', true);
    return;
  }

  try {
    const optionsRes = await fetch('/login/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const options = await optionsRes.json();

    if (options.error) {
      showMessage(options.error, true);
      return;
    }

    // Convert base64url strings to Uint8Array for WebAuthn API
    const publicKeyCredentialRequestOptions = {
      challenge: base64urlToUint8Array(options.challenge),
      timeout: options.timeout,
      rpId: options.rpId,
      allowCredentials: options.allowCredentials?.map(cred => ({
        ...cred,
        id: base64urlToUint8Array(cred.id),
      })),
      userVerification: options.userVerification,
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    // Convert credential response to JSON format
    const credentialJSON = {
      id: credential.id,
      rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
      response: {
        clientDataJSON: uint8ArrayToBase64url(new Uint8Array(credential.response.clientDataJSON)),
        authenticatorData: uint8ArrayToBase64url(new Uint8Array(credential.response.authenticatorData)),
        signature: uint8ArrayToBase64url(new Uint8Array(credential.response.signature)),
        userHandle: credential.response.userHandle ? uint8ArrayToBase64url(new Uint8Array(credential.response.userHandle)) : null,
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: credential.authenticatorAttachment,
    };

    const verifyRes = await fetch('/login/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, credential: credentialJSON })
    });
    const result = await verifyRes.json();

    if (result.verified) {
      sessionStorage.setItem('user', JSON.stringify(result.user));
      window.location.href = '/dashboard.html';
    } else {
      showMessage('Login failed', true);
    }
  } catch (error) {
    showMessage(error.message, true);
  }
};
