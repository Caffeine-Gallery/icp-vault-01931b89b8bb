import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Hash "mo:base/Hash";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";

import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Error "mo:base/Error";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Result "mo:base/Result";

actor class TokenDApp() {
    type Token = actor {
        icrc1_balance_of : shared query { owner : Principal; subaccount : ?[Nat8] } -> async Nat;
        icrc1_transfer : shared {
            to : { owner : Principal; subaccount : ?[Nat8] };
            amount : Nat;
            fee : ?Nat;
            memo : ?[Nat8];
            from_subaccount : ?[Nat8];
            created_at_time : ?Nat64;
        } -> async { Ok : Nat; Err : Text };
    };

    let ckSepoliaUSDC_canister : Token = actor("ryjl3-tyaaa-aaaaa-aaaba-cai");

    stable var balanceEntries : [(Principal, Nat)] = [];
    var balances = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);

    public query({ caller }) func getPrincipal() : async Principal {
        if (Principal.isAnonymous(caller)) {
            throw Error.reject("Anonymous principal not allowed");
        };
        derivePrincipal(caller)
    };

    private func derivePrincipal(caller : Principal) : Principal {
        // This ensures a unique principal per user while maintaining consistency
        let seed = Principal.toBlob(caller);
        Principal.fromBlob(seed)
    };

    public shared({ caller }) func withdraw(to : Principal, amount : Nat) : async Result.Result<(), Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        let userPrincipal = derivePrincipal(caller);
        let balance = Option.get(balances.get(userPrincipal), 0);
        
        if (balance < amount) {
            return #err("Insufficient balance");
        };

        try {
            let result = await ckSepoliaUSDC_canister.icrc1_transfer({
                to = { owner = to; subaccount = null };
                amount = amount;
                fee = null;
                memo = null;
                from_subaccount = null;
                created_at_time = null;
            });

            switch(result) {
                case ({ Ok = _ }) {
                    balances.put(userPrincipal, balance - amount);
                    #ok(());
                };
                case ({ Err = e }) {
                    #err(e);
                };
            };
        } catch (e) {
            #err("Transfer failed: " # Error.message(e));
        };
    };

    public query({ caller }) func getBalance() : async Nat {
        if (Principal.isAnonymous(caller)) {
            return 0;
        };
        let userPrincipal = derivePrincipal(caller);
        Option.get(balances.get(userPrincipal), 0)
    };

    system func preupgrade() {
        balanceEntries := Iter.toArray(balances.entries());
    };

    system func postupgrade() {
        balances := HashMap.fromIter<Principal, Nat>(balanceEntries.vals(), 0, Principal.equal, Principal.hash);
        balanceEntries := [];
    };
}
