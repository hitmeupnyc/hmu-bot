import { FetchHttpClient, HttpApiClient, HttpClient } from '@effect/platform';
import { Effect } from 'effect';
import { Api } from '~/api';

export interface ClientConfig {
  baseUrl: string;
}

function promisify<Args, A, E, R extends never>(
  apiCall: (args: Args) => Effect.Effect<A, E, R>
): (args: Args) => Promise<A> {
  return (p) => Effect.runPromise(apiCall(p));
}

function createPromiseClient(config: ClientConfig) {
  const { members, audit, events, flags } = Effect.runSync(
    HttpApiClient.make(Api, {
      baseUrl: config.baseUrl,
      transformClient: (client) => client.pipe(HttpClient.filterStatusOk),
    }).pipe(Effect.provide(FetchHttpClient.layer))
  );

  // Unwrap stuff from Effect and let it be used as a promise.
  // `promisify` has to be pretty careful about preserving types.
  return {
    members: {
      list: promisify(members.list),
      create: promisify(members.create),
      read: promisify(members.read),
      update: promisify(members.update),
      delete: promisify(members.delete),
      note: promisify(members.note),
      listFlags: promisify(members.listFlags),
      grantFlag: promisify(members.grantFlag),
      revokeFlag: promisify(members.revokeFlag),
      flagMembers: promisify(members.flagMembers),
    } satisfies Record<keyof typeof members, any>,
    events: {
      list: promisify(events.list),
      create: promisify(events.create),
      read: promisify(events.read),
      update: promisify(events.update),
      delete: promisify(events.delete),
      flags: promisify(events.flags),
      grantFlag: promisify(events.grantFlag),
      revokeFlag: promisify(events.revokeFlag),
    } satisfies Record<keyof typeof events, any>,
    flags: {
      list: promisify(flags.list),
      bulk: promisify(flags.bulk),
    } satisfies Record<keyof typeof flags, any>,
    audit: {
      list: promisify(audit.list),
    } satisfies Record<keyof typeof audit, any>,
  };
}

export const sdk = createPromiseClient({ baseUrl: 'localhost:5173' });
