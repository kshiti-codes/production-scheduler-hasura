import { useQuery, gql } from '@apollo/client';
import { format } from 'date-fns';

const GET_ORDER_BY_ID = gql`
  query GetOrderById($id: uuid!) {
    production_orders_by_pk(id: $id) {
      id
      order_number
      product_name
      quantity
      status
      priority
      scheduled_start
      scheduled_end
      actual_start
      actual_end
      notes
      created_at
      updated_at
      resource_allocations {
        id
        allocated_quantity
        start_time
        end_time
        resource {
          id
          name
          type
          status
          hourly_cost
        }
      }
      order_events(order_by: { created_at: desc }, limit: 10) {
        id
        event_type
        old_status
        new_status
        created_at
        metadata
      }
    }
  }
`;

interface OrderDetailsProps {
  orderId: string;
  onClose: () => void;
}

const OrderDetails = ({ orderId, onClose }: OrderDetailsProps) => {
  const { data, loading, error } = useQuery(GET_ORDER_BY_ID, {
    variables: { id: orderId },
    pollInterval: 5000, // Poll every 5 seconds for updates
  });

  const order = data?.production_orders_by_pk;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-red-600">Error loading order details</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const totalCost = order.resource_allocations.reduce((sum: number, alloc: any) => {
    const hours = alloc.end_time
      ? (new Date(alloc.end_time).getTime() - new Date(alloc.start_time).getTime()) / (1000 * 60 * 60)
      : 0;
    return sum + (alloc.resource.hourly_cost * hours || 0);
  }, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Info */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{order.order_number}</h4>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Product:</span>
              <span className="ml-2 font-medium text-gray-900">{order.product_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Quantity:</span>
              <span className="ml-2 font-medium text-gray-900">{order.quantity}</span>
            </div>
            <div>
              <span className="text-gray-500">Priority:</span>
              <span className="ml-2 font-medium text-gray-900">{order.priority}/5</span>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h5 className="font-semibold text-gray-900 mb-3">Schedule</h5>
          <div className="space-y-2 text-sm">
            {order.scheduled_start && (
              <div>
                <span className="text-gray-500">Scheduled Start:</span>
                <span className="ml-2 text-gray-900">
                  {format(new Date(order.scheduled_start), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
            {order.scheduled_end && (
              <div>
                <span className="text-gray-500">Scheduled End:</span>
                <span className="ml-2 text-gray-900">
                  {format(new Date(order.scheduled_end), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
            {order.actual_start && (
              <div>
                <span className="text-gray-500">Actual Start:</span>
                <span className="ml-2 text-gray-900">
                  {format(new Date(order.actual_start), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Allocated Resources */}
        <div>
          <h5 className="font-semibold text-gray-900 mb-3">
            Allocated Resources ({order.resource_allocations.length})
          </h5>
          {order.resource_allocations.length === 0 ? (
            <p className="text-sm text-gray-500">No resources allocated yet</p>
          ) : (
            <div className="space-y-2">
              {order.resource_allocations.map((alloc: any) => (
                <div
                  key={alloc.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {alloc.resource.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alloc.resource.type} • {alloc.resource.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Qty: {alloc.allocated_quantity}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      ${alloc.resource.hourly_cost}/hr
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Estimated Cost:</span>
                  <span className="font-semibold text-gray-900">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event History */}
        <div>
          <h5 className="font-semibold text-gray-900 mb-3">
            Event History ({order.order_events.length})
          </h5>
          {order.order_events.length === 0 ? (
            <p className="text-sm text-gray-500">No events recorded</p>
          ) : (
            <div className="space-y-2">
              {order.order_events.map((event: any) => (
                <div
                  key={event.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.event_type.replace('_', ' ')}
                      </p>
                      {event.old_status && event.new_status && (
                        <p className="text-xs text-gray-600 mt-1">
                          {event.old_status} → {event.new_status}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Notes</h5>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {order.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;