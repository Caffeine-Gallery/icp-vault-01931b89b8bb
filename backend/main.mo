import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Stack "mo:base/Stack";
import Text "mo:base/Text";

import Principal "mo:base/Principal";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
import Result "mo:base/Result";
import Nat "mo:base/Nat";

actor class TokenDApp() {
    stable var cachedFee : Nat = 0;

    type Account = {
        owner : Principal;
        subaccount : ?[Nat8];
    };

    type Token = actor {
        icrc1_balance_of : shared query (Account) -> async Nat;
        icrc1_transfer : shared {
            to : Account;
            amount : Nat;
            fee : ?Nat;
            memo : ?[Nat8];
            from_subaccount : ?[Nat8];
            created_at_time : ?Nat64;
        } -> async { Ok : Nat; Err : Text };
        icrc1_fee : shared query () -> async Nat;
    };

    let ckSepoliaUSDC_canister : Token = actor("24ago-6iaaa-aaaab-qaj3q-cai");

    public shared func updateFee() : async () {
        Debug.print("Updating fee from canister: 24ago-6iaaa-aaaab-qaj3q-cai");
        cachedFee := await ckSepoliaUSDC_canister.icrc1_fee();
        Debug.print("Fee updated to: " # debug_show(cachedFee));
    };

    public shared({ caller }) func withdraw(to : Principal, amount : Nat) : async Result.Result<(), Text> {
        Debug.print("Withdraw request from: " # debug_show(caller));
        Debug.print("To: " # debug_show(to));
        Debug.print("Amount: " # debug_show(amount));
        Debug.print("Using token canister: 24ago-6iaaa-aaaab-qaj3q-cai");
        
        if (Principal.isAnonymous(caller)) {
            Debug.print("Error: Anonymous principal not allowed");
            return #err("Anonymous principal not allowed");
        };

        if (amount == 0) {
            Debug.print("Error: Amount cannot be zero");
            return #err("Amount cannot be zero");
        };

        try {
            let balance = await ckSepoliaUSDC_canister.icrc1_balance_of({
                owner = caller;
                subaccount = null;
            });
            Debug.print("Current balance: " # debug_show(balance));
            Debug.print("Current fee: " # debug_show(cachedFee));

            if (balance < (amount + cachedFee)) {
                Debug.print("Error: Insufficient balance including fee");
                return #err("Insufficient balance including fee. Required: " # Nat.toText(amount + cachedFee) # ", Available: " # Nat.toText(balance));
            };

            Debug.print("Initiating transfer...");
            Debug.print("Transfer parameters:");
            Debug.print("From: " # debug_show(caller));
            Debug.print("To: " # debug_show(to));
            Debug.print("Amount: " # debug_show(amount));
            Debug.print("Fee: " # debug_show(cachedFee));

            let result = await ckSepoliaUSDC_canister.icrc1_transfer({
                to = {
                    owner = to;
                    subaccount = null;
                };
                amount = amount;
                fee = ?cachedFee;
                memo = null;
                from_subaccount = null;
                created_at_time = null;
            });

            switch(result) {
                case ({ Ok = blockIndex }) { 
                    Debug.print("Transfer successful. Block index: " # debug_show(blockIndex));
                    #ok(());
                };
                case ({ Err = e }) {
                    Debug.print("Transfer failed with error: " # e);
                    #err("Transfer failed: " # e);
                };
            };
        } catch (e) {
            let errorMsg = Error.message(e);
            Debug.print("Transfer failed with exception: " # errorMsg);
            Debug.print("Stack trace: " # Error.message(e));
            #err("Transfer failed: " # errorMsg);
        };
    };

    public shared({ caller }) func getBalance() : async Nat {
        Debug.print("Getting balance for: " # debug_show(caller));
        Debug.print("Using token canister: 24ago-6iaaa-aaaab-qaj3q-cai");
        
        if (Principal.isAnonymous(caller)) {
            Debug.print("Anonymous principal attempted to get balance");
            return 0;
        };
        
        try {
            let balance = await ckSepoliaUSDC_canister.icrc1_balance_of({
                owner = caller;
                subaccount = null;
            });
            Debug.print("Balance for " # debug_show(caller) # ": " # debug_show(balance));
            balance
        } catch (e) {
            Debug.print("Failed to get balance: " # Error.message(e));
            Debug.print("Stack trace: " # Error.message(e));
            0
        }
    };

    public query func getFee() : async Nat {
        Debug.print("Current fee: " # debug_show(cachedFee));
        cachedFee
    };
}
