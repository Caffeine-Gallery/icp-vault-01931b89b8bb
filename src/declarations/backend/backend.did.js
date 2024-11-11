export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const TokenDApp = IDL.Service({
    'deposit' : IDL.Func([IDL.Nat], [Result], []),
    'getBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'withdraw' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
  });
  return TokenDApp;
};
export const init = ({ IDL }) => { return []; };