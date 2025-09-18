// organize-imports-ignore
import type { Sink, Stream, Channel } from 'effect';
import type { NodeInspectSymbol } from 'effect/Inspectable';

import { FetchHttpClient, HttpApiClient, HttpClient } from '@effect/platform';
import { Effect } from 'effect';
import { Api } from '../api';

const apiClient = Effect.runSync(
  HttpApiClient.make(Api, {
    baseUrl: 'localhost:5173',
    transformClient: (client) => client.pipe(HttpClient.filterStatusOk),
  }).pipe(Effect.provide(FetchHttpClient.layer))
);
type ApiClient = typeof apiClient;

type MembersClient = ApiClient['members'];
type EventsClient = ApiClient['events'];
type FlagsClient = ApiClient['flags'];
type AuditClient = ApiClient['audit'];

type UnwrapEffect<E> = E extends (
  r: infer Params extends Record<string, any>
) => Effect.Effect<infer Output, infer Errors>
  ? { params: Params; response: Output; errors: Errors }
  : never;

type x = UnwrapEffect<MembersClient['list']>;

export type Members = {
  list: UnwrapEffect<MembersClient['list']>;
  read: UnwrapEffect<MembersClient['read']>;
  create: UnwrapEffect<MembersClient['create']>;
  update: UnwrapEffect<MembersClient['update']>;
  delete: UnwrapEffect<MembersClient['delete']>;
  note: UnwrapEffect<MembersClient['note']>;
  listFlags: UnwrapEffect<MembersClient['listFlags']>;
  grantFlag: UnwrapEffect<MembersClient['grantFlag']>;
  revokeFlag: UnwrapEffect<MembersClient['revokeFlag']>;
  flagMembers: UnwrapEffect<MembersClient['flagMembers']>;
};

export type Events = {
  list: UnwrapEffect<EventsClient['list']>;
  read: UnwrapEffect<EventsClient['read']>;
  create: UnwrapEffect<EventsClient['create']>;
  update: UnwrapEffect<EventsClient['update']>;
  delete: UnwrapEffect<EventsClient['delete']>;
  flags: UnwrapEffect<EventsClient['flags']>;
  grantFlag: UnwrapEffect<EventsClient['grantFlag']>;
  revokeFlag: UnwrapEffect<EventsClient['revokeFlag']>;
};

export type Flags = {
  list: UnwrapEffect<FlagsClient['list']>;
  bulk: UnwrapEffect<FlagsClient['bulk']>;
};

export type AuditLog = {
  list: UnwrapEffect<AuditClient['list']>;
};

// function promisify<Args, A, E, R extends never>(
//   apiCall: (args: Args) => Effect.Effect<A, E, R>
// ): (args: Args) => Promise<A> {
//   return (p) => Effect.runPromise(apiCall(p));
// }
