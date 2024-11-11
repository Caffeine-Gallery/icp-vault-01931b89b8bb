import Array "mo:base/Array";
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
    // ckSepoliaUSDC token canister interface
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

    public shared({ caller }) func deposit(amount : Nat) : async Result.Result<(), Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        try {
            let currentBalance = await ckSepoliaUSDC_canister.icrc1_balance_of({ owner = caller; subaccount = null });
            if (currentBalance < amount) {
                return #err("Insufficient balance");
            };

            let result = await ckSepoliaUSDC_canister.icrc1_transfer({
                to = { owner = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"); subaccount = null };
                amount = amount;
                fee = null;
                memo = null;
                from_subaccount = null;
                created_at_time = null;
            });

            switch(result) {
                case ({ Ok = _ }) {
                    let oldBalance = Option.get(balances.get(caller), 0);
                    balances.put(caller, oldBalance + amount);
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

    public shared({ caller }) func withdraw(to : Principal, amount : Nat) : async Result.Result<(), Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous principal not allowed");
        };

        let balance = Option.get(balances.get(caller), 0);
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
                    balances.put(caller, balance - amount);
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
        Option.get(balances.get(caller), 0);
    };

    system func preupgrade() {
        balanceEntries := Iter.toArray(balances.entries());
    };

    system func postupgrade() {
        balances := HashMap.fromIter<Principal, Nat>(balanceEntries.vals(), 0, Principal.equal, Principal.hash);
        balanceEntries := [];
    };
}
