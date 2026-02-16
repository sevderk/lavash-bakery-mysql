-- ============================================================
-- Lavash Bakery Management — MySQL Schema
-- Run this against your MySQL database before starting the server.
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(50)  DEFAULT NULL,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    customer_id    INT NOT NULL,
    quantity       INT NOT NULL,
    unit_price     DECIMAL(12,2) NOT NULL,
    total_price    DECIMAL(12,2) NOT NULL,
    status         ENUM('pending','paid') NOT NULL DEFAULT 'pending',
    order_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_group_id VARCHAR(36) DEFAULT NULL,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    customer_id    INT NOT NULL,
    amount         DECIMAL(12,2) NOT NULL,
    payment_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note           TEXT DEFAULT NULL,

    CONSTRAINT fk_payments_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for faster customer-scoped queries
CREATE INDEX idx_orders_customer_id   ON orders(customer_id);
CREATE INDEX idx_orders_group_id      ON orders(order_group_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
