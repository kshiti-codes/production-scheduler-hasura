import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { gql } from '@apollo/client';

// We'll use inline queries for now until codegen is run
const GET_PRODUCTION_ORDERS = gql`
  query GetProductionOrders {
    production_orders(order_by: { priority: desc, scheduled_start: asc }) {
      id
      order_number
      product_name
      quantity
      status
      priority
      scheduled_start
      scheduled_end
      updated_at
      resource_allocations_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const WATCH_PRODUCTION_ORDERS = gql`
  subscription WatchProductionOrders {
    production_orders(order_by: { priority: desc, scheduled_start: asc }) {
      id
      order_number
      product_name
      quantity
      status
      priority
      scheduled_start
      scheduled_end
      updated_at
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: uuid!, $status: order_status!) {
    update_production_orders_by_pk(
      pk_columns: { id: $id }
      _set: { status: $status }
    ) {
      id
      status
      updated_at
    }
  }
`;

interface OrdersListProps {
  onSelectOrder: (orderId: string) => void;
  selectedOrderId: string | null;
}

type OrderStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const OrdersList = ({ onSelectOrder, selectedOrderId }: OrdersListProps) => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  
  // Use subscription for real-time updates
  const { data: subData } = useSubscription(WATCH_PRODUCTION_ORDERS);
  const { data: queryData, loading } = useQuery(GET_PRODUCTION_ORDERS);
  
  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);

  // Use subscription data if available, otherwise use query data
  const orders = subData?.production_orders || queryData?.production_orders || [];

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((order: any) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
      scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 4) return 'bg-red-500';
    if (priority >= 3) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus({
        variables: { id: orderId, status: newStatus },
        optimisticResponse: {
          update_production_orders_by_pk: {
            __typename: 'production_orders',
            id: orderId,
            status: newStatus,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Production Orders ({filteredOrders.length})
          </h2>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-gray-200">
        {filteredOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          filteredOrders.map((order: any) => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className={`
                px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors
                ${selectedOrderId === order.id ? 'bg-blue-50 border-l-4 border-primary-500' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    {/* Priority Badge */}
                    <div className={`w-2 h-2 rounded-full ${getPriorityBadge(order.priority)}`} />
                    
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {order.order_number}
                    </h3>
                    
                    {/* Status Badge */}
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full border
                      ${getStatusColor(order.status)}
                    `}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    {order.product_name}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Qty: {order.quantity}</span>
                    <span>Priority: {order.priority}</span>
                    {order.scheduled_start && (
                      <span>
                        Start: {format(new Date(order.scheduled_start), 'MMM dd, HH:mm')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Status Actions */}
                <div className="ml-4 flex flex-col space-y-1">
                  {order.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, 'scheduled');
                      }}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Schedule
                    </button>
                  )}
                  {order.status === 'scheduled' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, 'in_progress');
                      }}
                      className="px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50 rounded"
                    >
                      Start
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, 'completed');
                      }}
                      className="px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdersList;