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

    public shared func updateFee() : async () {
        let result = await ic.http_request({
            url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
            max_response_bytes = null;
            headers = [];
            body = null;
            method = #get;
            transform = null;
        });

        if (result.status >= 200 and result.status < 300) {
            Debug.print("Received response");
        } else {
            Debug.print("Failed to fetch price");
            return;
        };
    };

    public query func getFee() : async Nat {
        fee
    };
}
