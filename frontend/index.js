import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory as backendIdlFactory } from "declarations/backend/backend.did.js";
import { canisterId as backendCanisterId } from "declarations/backend/index.js";
import { idlFactory as usdcIdlFactory } from "./usdc.did.js";

let authClient;
let identity;
let actor;
let usdcActor;
let balanceInterval;
let feeInterval;
let currentBalance = 0n;
let currentFee = 0n;

const USDC_CANISTER_ID = "yfumr-cyaaa-aaaar-qaela-cai";

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

async function initActors(identity) {
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

        actor = Actor.createActor(backendIdlFactory, {
            agent,
            canisterId: backendCanisterId,
        });
        
        usdcActor = Actor.createActor(usdcIdlFactory, {
            agent,
            canisterId: USDC_CANISTER_ID,
        });

        return { actor, usdcActor };
    } catch (e) {
        console.error("Failed to initialize actors:", e);
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
        
        const actors = await initActors(identity);
        actor = actors.actor;
        usdcActor = actors.usdcActor;
        
        console.log("Actors initialized with identity:", principal.toString());
        
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
        }, 300000);
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
    if (!usdcActor || !identity) {
        console.warn("USDC Actor or identity not initialized, skipping balance update");
        return;
    }

    try {
        const principal = identity.getPrincipal();
        currentBalance = await usdcActor.icrc1_balance_of({
            owner: principal,
            subaccount: []
        });
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
    usdcActor = null;
    identity = null;
    mainSection.classList.add("d-none");
    loginSection.classList.remove("d-none");
    principalIdInput.value = "";
});

withdrawButton.addEventListener("click", async () => {
    if (!usdcActor || !identity) {
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
        console.log("Initiating transfer:", {
            amount: amount.toString(),
            recipient: recipientPrincipal,
            fee: currentFee.toString(),
            balance: currentBalance.toString(),
            caller: identity.getPrincipal().toString()
        });

        const recipient = Principal.fromText(recipientPrincipal);
        const result = await usdcActor.icrc1_transfer({
            to: {
                owner: recipient,
                subaccount: []
            },
            amount: amount,
            fee: [currentFee],
            memo: [],
            from_subaccount: [],
            created_at_time: []
        });

        console.log("Transfer result:", result);

        if ('Ok' in result) {
            alert("Transfer successful!");
            await updateBalance();
        } else {
            alert(`Transfer failed: ${result.Err}`);
        }
    } catch (e) {
        console.error("Transfer error:", e);
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
