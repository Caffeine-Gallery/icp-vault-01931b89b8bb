export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  return IDL.Service({
    'getFee' : IDL.Func([], [IDL.Nat], ['query']),
    'updateFee' : IDL.Func([], [Result], []),
    'whoami' : IDL.Func([], [IDL.Principal], []),
  });
};
export const init = ({ IDL }) => { return []; };
