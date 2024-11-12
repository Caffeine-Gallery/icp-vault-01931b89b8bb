import Principal "mo:base/Principal";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Text "mo:base/Text";
import IC "mo:ic";

actor {
    let ic : IC.Service = actor("aaaaa-aa");
    stable var fee : Nat = 0;

    public shared(msg) func whoami() : async Principal {
        msg.caller
    };

    public shared func updateFee() : async Result.Result<(), Text> {
        try {
            let result = await ic.http_request({
                url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
                max_response_bytes = null;
                headers = [];
                body = null;
                method = #get;
                transform = null;
            });

            if (result.status >= 200 and result.status < 300) {
                fee := 10000; // Default fee for now
                #ok(())
            } else {
                #err("Failed to fetch price")
            };
        } catch (e) {
            #err("Error: " # Error.message(e))
        }
    };

    public query func getFee() : async Nat {
        fee
    };
}
