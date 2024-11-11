import { AuthClient } from "@dfinity/auth-client";
import { backend } from "declarations/backend";
import { Principal } from "@dfinity/principal";
import { createActor } from "declarations/backend";

let authClient;
let identity;
let actor;

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const loader = document.getElementById("loader");
const balanceElement = document.getElementById("balance");
const withdrawButton = document.getElementById("withdrawButton");
const delegatedIdInput = document.getElementById("delegatedId");
const copyDelegatedIdButton = document.getElementById("copyDelegatedId");

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
    
    // Create actor with identity
    actor = createActor(process.env.CANISTER_ID_BACKEND, {
        agentOptions: {
            identity,
        },
    });

    // Display delegated identity
    delegatedIdInput.value = principal.toString();
    
    await updateBalance();
}

async function updateBalance() {
    showLoader();
    try {
        const balance = await actor.getBalance();
        balanceElement.textContent = `${balance} ckSepoliaUSDC`;
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

copyDelegatedIdButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(delegatedIdInput.value);
        alert("Delegated Identity copied to clipboard!");
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
