import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";

import Principal "mo:base/Principal";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
import Result "mo:base/Result";

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

    let ckSepoliaUSDC_canister : Token = actor("yfumr-cyaaa-aaaar-qaela-cai");

    public shared func updateFee() : async () {
        cachedFee := await ckSepoliaUSDC_canister.icrc1_fee();
    };

    public shared({ caller }) func withdraw(to : Principal, amount : Nat) : async Result.Result<(), Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        let balance = await ckSepoliaUSDC_canister.icrc1_balance_of({
            owner = caller;
            subaccount = null;
        });

        if (balance < (amount + cachedFee)) {
            return #err("Insufficient balance including fee");
        };

        try {
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
                case ({ Ok = _ }) { #ok(()); };
                case ({ Err = e }) { #err(e); };
            };
        } catch (e) {
            #err("Transfer failed: " # Error.message(e));
        };
    };

    public shared({ caller }) func getBalance() : async Nat {
        if (Principal.isAnonymous(caller)) {
            return 0;
        };
        
        try {
            await ckSepoliaUSDC_canister.icrc1_balance_of({
                owner = caller;
                subaccount = null;
            });
        } catch (e) {
            Debug.print("Failed to get balance: " # Error.message(e));
            0
        }
    };

    public query func getFee() : async Nat {
        cachedFee
    };
}
