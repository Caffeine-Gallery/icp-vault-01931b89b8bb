import { AuthClient } from "@dfinity/auth-client";
import { backend } from "declarations/backend";

let authClient;

async function init() {
    authClient = await AuthClient.create();
    if (await authClient.isAuthenticated()) {
        handleAuthenticated();
    }
}

async function handleAuthenticated() {
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('appSection').classList.remove('d-none');
    
    const principal = await backend.whoami();
    document.getElementById('principalId').textContent = principal.toString();
    
    updateFeeDisplay();
}

async function updateFeeDisplay() {
    try {
        const fee = await backend.getFee();
        document.getElementById('currentFee').textContent = fee.toString();
    } catch (e) {
        console.error("Failed to get fee:", e);
    }
}

document.getElementById('loginButton').addEventListener('click', async () => {
    await authClient.login({
        identityProvider: "https://identity.ic0.app",
        onSuccess: handleAuthenticated,
    });
});

document.getElementById('updateFeeButton').addEventListener('click', async () => {
    try {
        const result = await backend.updateFee();
        await updateFeeDisplay();
    } catch (e) {
        console.error("Failed to update fee:", e);
    }
});

document.getElementById('logoutButton').addEventListener('click', async () => {
    await authClient.logout();
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('appSection').classList.add('d-none');
});

init();
