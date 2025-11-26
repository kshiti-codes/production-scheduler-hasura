import { useQuery, gql } from '@apollo/client';
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData {
    production_orders {
      status
      priority
      quantity
    }
    resources {
      type
      status
      hourly_cost
      resource_allocations_aggregate {
        aggregate {
          count
        }
      }
    }
    order_events_aggregate {
      aggregate {
        count
      }
    }
  }
`;

const Analytics = () => {
  const { data, loading } = useQuery(GET_ANALYTICS_DATA, {
    pollInterval: 10000, // Refresh every 10 seconds
  });

  const statusData = useMemo(() => {
    if (!data?.production_orders) return [];
    
    const statusCounts: Record<string, number> = {};
    data.production_orders.forEach((order: any) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
    }));
  }, [data]);

  const resourceTypeData = useMemo(() => {
    if (!data?.resources) return [];
    
    const typeCounts: Record<string, { count: number; active: number }> = {};
    data.resources.forEach((resource: any) => {
      if (!typeCounts[resource.type]) {
        typeCounts[resource.type] = { count: 0, active: 0 };
      }
      typeCounts[resource.type].count++;
      if (resource.resource_allocations_aggregate.aggregate.count > 0) {
        typeCounts[resource.type].active++;
      }
    });

    return Object.entries(typeCounts).map(([type, data]) => ({
      name: type,
      total: data.count,
      active: data.active,
      idle: data.count - data.active,
    }));
  }, [data]);

  const priorityData = useMemo(() => {
    if (!data?.production_orders) return [];
    
    const priorityCounts: Record<number, number> = {};
    data.production_orders.forEach((order: any) => {
      priorityCounts[order.priority] = (priorityCounts[order.priority] || 0) + 1;
    });

    return Object.entries(priorityCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([priority, count]) => ({
        name: `Priority ${priority}`,
        orders: count,
      }));
  }, [data]);

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const totalOrders = data?.production_orders?.length || 0;
  const totalResources = data?.resources?.length || 0;
  const totalEvents = data?.order_events_aggregate?.aggregate?.count || 0;
  const activeResources = data?.resources?.filter(
    (r: any) => r.resource_allocations_aggregate.aggregate.count > 0
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Resources</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalResources}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🏭</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Resources</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{activeResources}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalEvents}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Order Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Priority */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Orders by Priority Level
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Resource Utilization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resource Utilization by Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resourceTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" stackId="a" fill="#22c55e" name="Active" />
              <Bar dataKey="idle" stackId="a" fill="#94a3b8" name="Idle" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Status Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resource Status Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['available', 'in_use', 'maintenance', 'unavailable'].map((status) => {
            const count = data?.resources?.filter((r: any) => r.status === status).length || 0;
            const statusColors: Record<string, string> = {
              available: 'bg-green-100 text-green-700',
              in_use: 'bg-yellow-100 text-yellow-700',
              maintenance: 'bg-orange-100 text-orange-700',
              unavailable: 'bg-red-100 text-red-700',
            };

            return (
              <div
                key={status}
                className={`p-4 rounded-lg border ${statusColors[status]}`}
              >
                <p className="text-sm font-medium capitalize">
                  {status.replace('_', ' ')}
                </p>
                <p className="text-2xl font-bold mt-2">{count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Analytics;