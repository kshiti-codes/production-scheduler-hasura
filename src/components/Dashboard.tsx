import { useState } from 'react';
import OrdersList from './OrdersList';
import ResourcesList from './ResourcesList';
import OrderDetails from './OrderDetails';
import Analytics from './Analytics';

type TabType = 'orders' | 'resources' | 'analytics';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'orders', label: 'Production Orders', icon: '📋' },
    { id: 'resources', label: 'Resources', icon: '🏭' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <nav className="flex space-x-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedOrderId(null);
              }}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className={selectedOrderId ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {activeTab === 'orders' && (
            <OrdersList
              onSelectOrder={setSelectedOrderId}
              selectedOrderId={selectedOrderId}
            />
          )}
          {activeTab === 'resources' && <ResourcesList />}
          {activeTab === 'analytics' && <Analytics />}
        </div>

        {/* Order Details Sidebar */}
        {selectedOrderId && activeTab === 'orders' && (
          <div className="lg:col-span-1">
            <OrderDetails
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;