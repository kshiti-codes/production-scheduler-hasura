import { useQuery, useSubscription, useMutation, gql } from '@apollo/client';
import { useState, useMemo } from 'react';

const GET_RESOURCES = gql`
  query GetResources {
    resources(order_by: { type: asc, name: asc }) {
      id
      name
      type
      status
      capacity
      hourly_cost
      description
      resource_allocations_aggregate {
        aggregate {
          count
          sum {
            allocated_quantity
          }
        }
      }
    }
  }
`;

const WATCH_RESOURCES = gql`
  subscription WatchResources {
    resources(order_by: { type: asc, name: asc }) {
      id
      name
      type
      status
      resource_allocations_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const UPDATE_RESOURCE_STATUS = gql`
  mutation UpdateResourceStatus($id: uuid!, $status: resource_status!) {
    update_resources_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
      id
      status
      updated_at
    }
  }
`;

type ResourceType = 'machine' | 'worker' | 'material';
type ResourceStatus = 'available' | 'in_use' | 'maintenance' | 'unavailable';

const ResourcesList = () => {
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');

  const { data: subData } = useSubscription(WATCH_RESOURCES);
  const { data: queryData, loading } = useQuery(GET_RESOURCES);
  const [updateStatus] = useMutation(UPDATE_RESOURCE_STATUS);

  const resources = subData?.resources || queryData?.resources || [];

  const filteredResources = useMemo(() => {
    return resources.filter((resource: any) => {
      if (typeFilter !== 'all' && resource.type !== typeFilter) return false;
      if (statusFilter !== 'all' && resource.status !== statusFilter) return false;
      return true;
    });
  }, [resources, typeFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-700 border-green-200',
      in_use: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
      unavailable: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status as keyof typeof colors] || colors.available;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      machine: '🏭',
      worker: '👷',
      material: '📦',
    };
    return icons[type as keyof typeof icons] || '📋';
  };

  const handleStatusChange = async (resourceId: string, newStatus: ResourceStatus) => {
    try {
      await updateStatus({
        variables: { id: resourceId, status: newStatus },
        optimisticResponse: {
          update_resources_by_pk: {
            __typename: 'resources',
            id: resourceId,
            status: newStatus,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const groupedResources = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredResources.forEach((resource: any) => {
      if (!grouped[resource.type]) {
        grouped[resource.type] = [];
      }
      grouped[resource.type].push(resource);
    });
    return grouped;
  }, [filteredResources]);

  if (loading && !subData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ResourceType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="machine">Machines</option>
              <option value="worker">Workers</option>
              <option value="material">Materials</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ResourceStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources by Type */}
      {Object.keys(groupedResources).length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No resources found</p>
        </div>
      ) : (
        Object.entries(groupedResources).map(([type, typeResources]) => (
          <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Type Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getTypeIcon(type)}</span>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {type}s ({typeResources.length})
                </h3>
              </div>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {typeResources.map((resource: any) => {
                const utilizationPercent = resource.capacity
                  ? ((resource.resource_allocations_aggregate.aggregate.sum?.allocated_quantity || 0) / resource.capacity) * 100
                  : 0;

                return (
                  <div
                    key={resource.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(resource.status)}`}>
                        {resource.status.replace('_', ' ')}
                      </span>
                    </div>

                    {resource.description && (
                      <p className="text-xs text-gray-600 mb-3">{resource.description}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      {resource.capacity && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Utilization</span>
                            <span>{utilizationPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                utilizationPercent > 80
                                  ? 'bg-red-500'
                                  : utilizationPercent > 50
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-500">Capacity:</span>
                        <span className="font-medium text-gray-900">
                          {resource.capacity || 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500">Cost:</span>
                        <span className="font-medium text-gray-900">
                          ${resource.hourly_cost}/hr
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500">Active Jobs:</span>
                        <span className="font-medium text-gray-900">
                          {resource.resource_allocations_aggregate.aggregate.count}
                        </span>
                      </div>
                    </div>

                    {/* Quick Status Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2">
                        {resource.status !== 'available' && (
                          <button
                            onClick={() => handleStatusChange(resource.id, 'available')}
                            className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
                          >
                            Set Available
                          </button>
                        )}
                        {resource.status !== 'maintenance' && (
                          <button
                            onClick={() => handleStatusChange(resource.id, 'maintenance')}
                            className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                          >
                            Maintenance
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ResourcesList;