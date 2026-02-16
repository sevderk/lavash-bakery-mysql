// ============================================================
// Lavash Bakery — API Service Layer
// Replaces all Supabase SDK calls with HTTP fetch to our Express backend.

const BASE_URL = 'http://192.168.1.5:3000';

// ── Helper ─────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
    }

    return body as T;
}

// ── Types (matching backend responses) ─────────────────────

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    current_balance: number;
    created_at: string;
}

export interface Order {
    id: number;
    customer_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: 'pending' | 'paid';
    order_date: string;
    order_group_id: string | null;
}

export interface Payment {
    id: number;
    customer_id: number;
    amount: number;
    payment_date: string;
    note: string | null;
}

export interface DashboardStats {
    todayQuantity: number;
    todayRevenue: number;
    todayCustomerCount: number;
    totalDebt: number;
}

export interface ReportRow {
    id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: string;
    customer_id: number;
    customer_name: string;
    current_balance: number;
}

export interface CustomerDetail {
    customer: Customer;
    orders: Order[];
    payments: Payment[];
}

// ── Customers ──────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
    return request<Customer[]>('/customers');
}

export async function addCustomer(customer: { name: string; phone?: string | null }): Promise<Customer> {
    return request<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
    });
}

export async function updateCustomer(
    id: number | string,
    data: { name: string; phone?: string | null }
): Promise<Customer> {
    return request<Customer>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteCustomer(id: number | string): Promise<{ message: string }> {
    return request<{ message: string }>(`/customers/${id}`, {
        method: 'DELETE',
    });
}

export async function getCustomerDetails(id: number | string): Promise<CustomerDetail> {
    return request<CustomerDetail>(`/customers/${id}`);
}

// ── Orders ─────────────────────────────────────────────────

export interface CreateOrderRow {
    customer_id: number | string;
    quantity: number;
    unit_price: number;
    total_price: number;
    order_group_id?: string | null;
}

export async function createOrders(orders: CreateOrderRow[]): Promise<{ message: string; ids: number[] }> {
    return request<{ message: string; ids: number[] }>('/orders', {
        method: 'POST',
        body: JSON.stringify(orders),
    });
}

// ── Payments ───────────────────────────────────────────────

export async function addPayment(payment: {
    customer_id: number | string;
    amount: number;
    note?: string | null;
}): Promise<Payment> {
    return request<Payment>('/payments', {
        method: 'POST',
        body: JSON.stringify(payment),
    });
}

// ── Dashboard ──────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard');
}

// ── Reports ────────────────────────────────────────────────

export async function getReports(date: string): Promise<ReportRow[]> {
    return request<ReportRow[]>(`/reports?date=${date}`);
}
