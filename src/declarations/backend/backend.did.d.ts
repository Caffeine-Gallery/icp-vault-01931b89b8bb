import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Result = { 'ok' : null } |
  { 'err' : string };
export interface TokenDApp {
  'getBalance' : ActorMethod<[], bigint>,
  'getPrincipal' : ActorMethod<[], Principal>,
  'withdraw' : ActorMethod<[Principal, bigint], Result>,
}
export interface _SERVICE extends TokenDApp {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
