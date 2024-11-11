import { AuthClient } from "@dfinity/auth-client";
import { backend } from "declarations/backend";
import { Principal } from "@dfinity/principal";

let authClient;
let identity;

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const loader = document.getElementById("loader");
const balanceElement = document.getElementById("balance");
const depositButton = document.getElementById("depositButton");
const withdrawButton = document.getElementById("withdrawButton");

async function init() {
    authClient = await AuthClient.create();
    if (await authClient.isAuthenticated()) {
        identity = await authClient.getIdentity();
        handleAuthenticated();
    }
}

async function handleAuthenticated() {
    loginSection.classList.add("d-none");
    mainSection.classList.remove("d-none");
    updateBalance();
}

async function updateBalance() {
    showLoader();
    try {
        const balance = await backend.getBalance();
        balanceElement.textContent = `${balance} ckUSDC`;
    } catch (e) {
        console.error("Failed to get balance:", e);
    }
    hideLoader();
}

loginButton.addEventListener("click", async () => {
    await authClient.login({
        identityProvider: process.env.II_URL || "https://identity.ic0.app",
        onSuccess: handleAuthenticated,
    });
});

logoutButton.addEventListener("click", async () => {
    await authClient.logout();
    mainSection.classList.add("d-none");
    loginSection.classList.remove("d-none");
});

depositButton.addEventListener("click", async () => {
    const amount = BigInt(document.getElementById("depositAmount").value);
    if (amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    showLoader();
    try {
        const result = await backend.deposit(amount);
        if ('ok' in result) {
            alert("Deposit successful!");
            updateBalance();
        } else {
            alert(`Deposit failed: ${result.err}`);
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
    hideLoader();
});

withdrawButton.addEventListener("click", async () => {
    const amount = BigInt(document.getElementById("withdrawAmount").value);
    const recipientPrincipal = document.getElementById("recipientPrincipal").value;
    
    if (amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    if (!recipientPrincipal) {
        alert("Please enter a recipient principal");
        return;
    }

    showLoader();
    try {
        const recipient = Principal.fromText(recipientPrincipal);
        const result = await backend.withdraw(recipient, amount);
        if ('ok' in result) {
            alert("Withdrawal successful!");
            updateBalance();
        } else {
            alert(`Withdrawal failed: ${result.err}`);
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
    hideLoader();
});

function showLoader() {
    loader.classList.remove("d-none");
}

function hideLoader() {
    loader.classList.add("d-none");
}

init();
