'use client';

import { ApolloClient, InMemoryCache, HttpLink, split, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { AuthRole, getToken } from './auth';

const HTTP_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  'https://enatega-singlevendor.up.railway.app/graphql';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_GRAPHQL_URL ||
  'wss://enatega-singlevendor.up.railway.app/graphql';

function createApolloClient(role: AuthRole = 'customer') {
  const httpLink = new HttpLink({ uri: HTTP_URL });

  const authLink = setContext((_, { headers }) => {
    const token = getToken(role);
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

  let link = from([authLink, httpLink]);

  if (typeof window !== 'undefined') {
    const wsLink = new GraphQLWsLink(
      createClient({
        url: WS_URL,
        connectionParams: () => {
          const token = getToken(role);
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      })
    );

    link = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      from([authLink, httpLink])
    );
  }

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
      query: { fetchPolicy: 'network-only' },
    },
  });
}

let customerClient: ApolloClient | null = null;
let adminClient: ApolloClient | null = null;
let riderClient: ApolloClient | null = null;

export function getApolloClient(role: AuthRole = 'customer') {
  if (role === 'admin') {
    if (!adminClient) adminClient = createApolloClient('admin');
    return adminClient;
  }
  if (role === 'rider') {
    if (!riderClient) riderClient = createApolloClient('rider');
    return riderClient;
  }
  if (!customerClient) customerClient = createApolloClient('customer');
  return customerClient;
}

export function resetApolloClients() {
  customerClient = null;
  adminClient = null;
  riderClient = null;
}
