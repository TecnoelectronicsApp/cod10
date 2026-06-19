'use client';

import { ApolloProvider } from '@apollo/client/react';
import { getApolloClient } from '@/lib/apollo-client';
import QuickAccessForm from '@/components/QuickAccessForm';

export default function LoginPage() {
  return (
    <ApolloProvider client={getApolloClient('customer')}>
      <QuickAccessForm />
    </ApolloProvider>
  );
}
