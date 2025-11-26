-- Create ENUM types for status tracking
CREATE TYPE order_status AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE resource_type AS ENUM ('machine', 'worker', 'material');
CREATE TYPE resource_status AS ENUM ('available', 'in_use', 'maintenance', 'unavailable');

-- Production Orders Table
CREATE TABLE production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status order_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resources Table (Machines, Workers, Materials)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type resource_type NOT NULL,
    status resource_status NOT NULL DEFAULT 'available',
    capacity DECIMAL(10,2),
    hourly_cost DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resource Allocations (Junction Table)
CREATE TABLE resource_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    allocated_quantity DECIMAL(10,2) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, resource_id, start_time)
);

-- Order History/Audit Log (Event Sourcing)
CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    old_status order_status,
    new_status order_status,
    changed_by VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_scheduled_start ON production_orders(scheduled_start);
CREATE INDEX idx_resources_type_status ON resources(type, status);
CREATE INDEX idx_resource_allocations_order_id ON resource_allocations(order_id);
CREATE INDEX idx_resource_allocations_resource_id ON resource_allocations(resource_id);
CREATE INDEX idx_order_events_order_id ON order_events(order_id);
CREATE INDEX idx_order_events_created_at ON order_events(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_allocations_updated_at BEFORE UPDATE ON resource_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log order status changes (Event Sourcing)
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO order_events (order_id, event_type, old_status, new_status, metadata)
        VALUES (NEW.id, 'status_change', OLD.status, NEW.status, 
                jsonb_build_object(
                    'order_number', NEW.order_number,
                    'product_name', NEW.product_name
                ));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for order status changes
CREATE TRIGGER log_production_order_status_change 
    AFTER UPDATE ON production_orders
    FOR EACH ROW 
    EXECUTE FUNCTION log_order_status_change();

-- Insert sample data
INSERT INTO resources (name, type, status, capacity, hourly_cost, description) VALUES
    ('CNC Machine 01', 'machine', 'available', 100.00, 50.00, 'High precision CNC machine for metal parts'),
    ('CNC Machine 02', 'machine', 'available', 100.00, 50.00, 'Standard CNC machine'),
    ('Assembly Line A', 'machine', 'available', 200.00, 30.00, 'Main assembly line'),
    ('Quality Control Station', 'machine', 'available', 50.00, 20.00, 'Automated quality inspection'),
    ('John Smith', 'worker', 'available', 8.00, 25.00, 'Senior Machine Operator'),
    ('Sarah Johnson', 'worker', 'available', 8.00, 25.00, 'Assembly Line Supervisor'),
    ('Mike Williams', 'worker', 'available', 8.00, 22.00, 'Quality Control Inspector'),
    ('Steel Grade A', 'material', 'available', 5000.00, 15.00, 'High-grade steel sheets'),
    ('Aluminum Alloy', 'material', 'available', 3000.00, 20.00, 'Aircraft-grade aluminum');

INSERT INTO production_orders (order_number, product_name, quantity, status, priority, scheduled_start, scheduled_end, notes) VALUES
    ('PO-2024-001', 'Industrial Valve Type A', 100, 'in_progress', 5, NOW(), NOW() + INTERVAL '2 days', 'Urgent order for key client'),
    ('PO-2024-002', 'Pump Housing Unit', 50, 'scheduled', 3, NOW() + INTERVAL '1 day', NOW() + INTERVAL '3 days', 'Standard production run'),
    ('PO-2024-003', 'Custom Gear Assembly', 200, 'pending', 2, NOW() + INTERVAL '3 days', NOW() + INTERVAL '7 days', 'Large order - plan carefully'),
    ('PO-2024-004', 'Pressure Sensor Mount', 150, 'in_progress', 4, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', 'Mid-priority order'),
    ('PO-2024-005', 'Control Panel Bracket', 75, 'completed', 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', 'Completed ahead of schedule');

-- Allocate some resources to orders
INSERT INTO resource_allocations (order_id, resource_id, allocated_quantity, start_time, end_time) 
SELECT 
    po.id, 
    r.id,
    50.00,
    po.scheduled_start,
    po.scheduled_end
FROM production_orders po
CROSS JOIN resources r
WHERE po.order_number = 'PO-2024-001' 
  AND r.name IN ('CNC Machine 01', 'John Smith', 'Steel Grade A')
LIMIT 3;

INSERT INTO resource_allocations (order_id, resource_id, allocated_quantity, start_time, end_time) 
SELECT 
    po.id, 
    r.id,
    25.00,
    po.scheduled_start,
    po.scheduled_end
FROM production_orders po
CROSS JOIN resources r
WHERE po.order_number = 'PO-2024-002' 
  AND r.name IN ('CNC Machine 02', 'Sarah Johnson')
LIMIT 2;