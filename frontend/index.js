import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { canisterId, idlFactory } from "declarations/backend";

let authClient;
let identity;
let actor;
let balanceInterval;
let feeInterval;
let currentBalance = 0n;
let currentFee = 0n;

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const loader = document.getElementById("loader");
const balanceElement = document.getElementById("balance");
const withdrawButton = document.getElementById("withdrawButton");
const principalIdInput = document.getElementById("principalId");
const copyPrincipalIdButton = document.getElementById("copyPrincipalId");
const maxAmountButton = document.getElementById("maxAmount");
const feeInfoElement = document.getElementById("feeInfo");
const withdrawAmountInput = document.getElementById("withdrawAmount");

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const host = isLocalhost ? "http://localhost:4943" : "https://icp0.io";

async function initActor(identity) {
    try {
        const agent = new HttpAgent({
            identity,
            host: host,
        });

        if (isLocalhost) {
            await agent.fetchRootKey().catch(err => {
                console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
                console.error(err);
            });
        }

        if (!canisterId) {
            throw new Error("Canister ID not found. Make sure the backend canister is deployed.");
        }

        return Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });
    } catch (e) {
        console.error("Failed to initialize actor:", e);
        throw e;
    }
}

async function init() {
    try {
        authClient = await AuthClient.create();
        if (await authClient.isAuthenticated()) {
            identity = await authClient.getIdentity();
            await handleAuthenticated();
        }
    } catch (e) {
        console.error("Failed to initialize application:", e);
    }
}

async function handleAuthenticated() {
    try {
        loginSection.classList.add("d-none");
        mainSection.classList.remove("d-none");
        
        identity = await authClient.getIdentity();
        const principal = identity.getPrincipal();
        console.log("Authenticated with principal:", principal.toString());
        
        principalIdInput.value = principal.toString();
        
        actor = await initActor(identity);
        await actor.updateFee();
        await updateBalance();
        await updateFee();
        
        if (balanceInterval) {
            clearInterval(balanceInterval);
        }
        balanceInterval = setInterval(updateBalance, 5000);

        if (feeInterval) {
            clearInterval(feeInterval);
        }
        feeInterval = setInterval(async () => {
            await actor.updateFee();
            await updateFee();
        }, 300000); // Update fee every 5 minutes
    } catch (e) {
        console.error("Failed during authentication:", e);
        alert("Failed to initialize the application. Please try logging in again.");
        await authClient.logout();
        location.reload();
    }
}

function formatBalance(rawBalance) {
    const decimals = 6;
    const balance = Number(rawBalance) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(balance);
}

async function updateBalance() {
    if (!actor) {
        console.warn("Actor not initialized, skipping balance update");
        return;
    }

    try {
        currentBalance = await actor.getBalance();
        balanceElement.textContent = `${formatBalance(currentBalance)} ckSepoliaUSDC`;
    } catch (e) {
        console.error("Failed to get balance:", e);
    }
}

async function updateFee() {
    if (!actor) return;
    try {
        currentFee = await actor.getFee();
        feeInfoElement.textContent = `Transaction fee: ${formatBalance(currentFee)} ckSepoliaUSDC`;
    } catch (e) {
        console.error("Failed to get fee:", e);
        feeInfoElement.textContent = "Failed to load fee information";
    }
}

maxAmountButton.addEventListener("click", () => {
    if (currentBalance > currentFee) {
        const maxAmount = Number(currentBalance - currentFee) / Math.pow(10, 6);
        withdrawAmountInput.value = maxAmount.toFixed(6);
    } else {
        alert("Insufficient balance to cover the fee");
    }
});

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
    if (feeInterval) {
        clearInterval(feeInterval);
    }
    await authClient.logout();
    actor = null;
    mainSection.classList.add("d-none");
    loginSection.classList.remove("d-none");
    principalIdInput.value = "";
});

withdrawButton.addEventListener("click", async () => {
    if (!actor) {
        alert("Please log in first");
        return;
    }

    const amountInput = withdrawAmountInput.value;
    if (!amountInput || parseFloat(amountInput) <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    const decimals = 6;
    const amount = BigInt(Math.floor(parseFloat(amountInput) * Math.pow(10, decimals)));
    const recipientPrincipal = document.getElementById("recipientPrincipal").value;
    
    if (!recipientPrincipal) {
        alert("Please enter a recipient principal");
        return;
    }

    if (amount + currentFee > currentBalance) {
        alert("Insufficient balance including fee");
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
