
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const HASURA_HTTP_URL = 'http://localhost:8080/v1/graphql';
const HASURA_WS_URL = 'ws://localhost:8080/v1/graphql';

// HTTP connection for queries and mutations
const httpLink = new HttpLink({
  uri: HASURA_HTTP_URL,
  headers: {
    'x-hasura-admin-secret': 'myadminsecretkey',
  },
});

// WebSocket connection for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: HASURA_WS_URL,
    connectionParams: {
      headers: {
        'x-hasura-admin-secret': 'myadminsecretkey',
      },
    },
  })
);

// Split link to route queries/mutations to HTTP and subscriptions to WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          production_orders: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          resources: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});