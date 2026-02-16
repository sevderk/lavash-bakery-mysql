/** Matches the `customers` table in MySQL */
export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    current_balance: number;
    created_at: string;
}

/** Matches the `order_status` enum in MySQL */
export type OrderStatus = 'pending' | 'paid';

/** Matches the `orders` table in MySQL */
export interface Order {
    id: number;
    customer_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: OrderStatus;
    order_date: string;
    order_group_id: string | null;
}

/** Matches the `payments` table in MySQL */
export interface Payment {
    id: number;
    customer_id: number;
    amount: number;
    payment_date: string;
    note: string | null;
}
