import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './apolloClient';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Production Scheduler
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Real-time Production Management System
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">
                    Live Updates
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Dashboard />
        </main>

        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-center text-sm text-gray-500">
              Built with Hasura + React + TypeScript | Kshiti Patel
            </p>
          </div>
        </footer>
      </div>
    </ApolloProvider>
  );
}

export default App;