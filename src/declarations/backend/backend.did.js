export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'getFee' : IDL.Func([], [IDL.Nat], ['query']),
    'updateFee' : IDL.Func([], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
