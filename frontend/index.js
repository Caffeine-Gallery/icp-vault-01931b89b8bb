import { AuthClient } from "@dfinity/auth-client";
import { backend } from "declarations/backend";
import { Principal } from "@dfinity/principal";
import { createActor } from "declarations/backend";

let authClient;
let identity;
let actor;
let balanceInterval;

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const loader = document.getElementById("loader");
const balanceElement = document.getElementById("balance");
const withdrawButton = document.getElementById("withdrawButton");
const principalIdInput = document.getElementById("principalId");
const copyPrincipalIdButton = document.getElementById("copyPrincipalId");

async function init() {
    authClient = await AuthClient.create();
    if (await authClient.isAuthenticated()) {
        identity = await authClient.getIdentity();
        await handleAuthenticated();
    }
}

async function handleAuthenticated() {
    loginSection.classList.add("d-none");
    mainSection.classList.remove("d-none");
    
    identity = await authClient.getIdentity();
    const principal = identity.getPrincipal();
    
    // Display the user's principal
    principalIdInput.value = principal.toString();
    
    // Create actor with identity
    actor = createActor(process.env.CANISTER_ID_BACKEND, {
        agentOptions: {
            identity,
        },
    });
    
    // Initial balance update
    await updateBalance();
    
    // Start balance polling
    if (balanceInterval) {
        clearInterval(balanceInterval);
    }
    balanceInterval = setInterval(updateBalance, 5000);
}

async function updateBalance() {
    try {
        const balance = await actor.getBalance();
        const formattedBalance = Number(balance) / 1_000_000; // Convert to USDC units (6 decimals)
        balanceElement.textContent = `${formattedBalance.toFixed(6)} ckSepoliaUSDC`;
    } catch (e) {
        console.error("Failed to get balance:", e);
    }
}

loginButton.addEventListener("click", async () => {
    showLoader();
    try {
        await authClient.login({
            identityProvider: process.env.II_URL || "https://identity.ic0.app",
            onSuccess: handleAuthenticated,
        });
    } catch (e) {
        console.error("Login failed:", e);
        alert("Failed to login. Please try again.");
    }
    hideLoader();
});

logoutButton.addEventListener("click", async () => {
    if (balanceInterval) {
        clearInterval(balanceInterval);
    }
    await authClient.logout();
    mainSection.classList.add("d-none");
    loginSection.classList.remove("d-none");
    principalIdInput.value = "";
});

withdrawButton.addEventListener("click", async () => {
    const amountInput = document.getElementById("withdrawAmount").value;
    if (!amountInput || parseFloat(amountInput) <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    const amount = BigInt(Math.floor(parseFloat(amountInput) * 1_000_000)); // Convert to token units
    const recipientPrincipal = document.getElementById("recipientPrincipal").value;
    
    if (!recipientPrincipal) {
        alert("Please enter a recipient principal");
        return;
    }

    showLoader();
    try {
        const recipient = Principal.fromText(recipientPrincipal);
        const result = await actor.withdraw(recipient, amount);
        if ('ok' in result) {
            alert("Withdrawal successful!");
            await updateBalance();
        } else {
            alert(`Withdrawal failed: ${result.err}`);
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
    hideLoader();
});

copyPrincipalIdButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(principalIdInput.value);
        alert("Principal ID copied to clipboard!");
    } catch (err) {
        console.error("Failed to copy text: ", err);
    }
});

function showLoader() {
    loader.classList.remove("d-none");
}

function hideLoader() {
    loader.classList.add("d-none");
}

init();
