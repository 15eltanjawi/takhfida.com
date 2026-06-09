<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_FILE',       __DIR__ . '/data/orders.json');
define('PRODUCTS_FILE', __DIR__ . '/data/products.json');
define('ADMIN_EMAIL',   'el.machichti.40@gmail.com');
define('ADMIN_KEY',     'forever-admin-2026');

if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get-products':   getProducts();         break;
    case 'submit-order':   submitOrder();          break;
    case 'get-orders':     getOrders();            break;
    case 'update-status':  updateOrderStatus();    break;
    case 'update-product': updateProduct();        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Action not found']);
}

// ─── Auth helper ────────────────────────────────────────────────────────────

function requireAdminKey() {
    $key = $_GET['key'] ?? '';
    if ($key !== ADMIN_KEY) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return false;
    }
    return true;
}

// ─── Get products ────────────────────────────────────────────────────────────

function getProducts() {
    if (file_exists(PRODUCTS_FILE)) {
        $products = json_decode(file_get_contents(PRODUCTS_FILE), true);
        echo json_encode(['success' => true, 'data' => $products]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Products not found']);
    }
}

// ─── Submit order ────────────────────────────────────────────────────────────

function submitOrder() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['name'], $input['phone'], $input['items'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    // Sanitize items array
    $items = [];
    foreach ((array)$input['items'] as $item) {
        $items[] = [
            'name'  => htmlspecialchars($item['name']  ?? ''),
            'qty'   => intval($item['qty']             ?? 1),
            'price' => floatval($item['price']         ?? 0),
        ];
    }

    $order = [
        'id'         => 'TKF-' . time() . '-' . rand(100, 999),
        'name'       => htmlspecialchars($input['name']),
        'phone'      => htmlspecialchars($input['phone']),
        'city'       => htmlspecialchars($input['city']    ?? ''),
        'address'    => htmlspecialchars($input['address'] ?? ''),
        'items'      => $items,
        'total'      => floatval($input['total']),
        'status'     => 'pending',
        'created_at' => date('Y-m-d H:i:s'),
    ];

    $orders = [];
    if (file_exists(DB_FILE)) {
        $orders = json_decode(file_get_contents(DB_FILE), true) ?? [];
    }

    array_unshift($orders, $order); // newest first

    if (file_put_contents(DB_FILE, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        sendOrderEmail($order);
        echo json_encode([
            'success' => true,
            'orderId' => $order['id'],
            'message' => 'Order saved',
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save order']);
    }
}

// ─── Get all orders (admin) ──────────────────────────────────────────────────

function getOrders() {
    if (!requireAdminKey()) return;

    if (file_exists(DB_FILE)) {
        $orders = json_decode(file_get_contents(DB_FILE), true) ?? [];
        echo json_encode(['success' => true, 'data' => $orders]);
    } else {
        echo json_encode(['success' => true, 'data' => []]);
    }
}

// ─── Update order status (admin) ─────────────────────────────────────────────

function updateOrderStatus() {
    if (!requireAdminKey()) return;

    $input   = json_decode(file_get_contents('php://input'), true);
    $id      = $input['id']     ?? '';
    $status  = $input['status'] ?? '';

    if (!$id || !in_array($status, ['pending', 'completed', 'cancelled'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid id or status']);
        return;
    }

    if (!file_exists(DB_FILE)) {
        http_response_code(404);
        echo json_encode(['error' => 'No orders file']);
        return;
    }

    $orders = json_decode(file_get_contents(DB_FILE), true) ?? [];
    $found  = false;
    foreach ($orders as &$order) {
        if ($order['id'] === $id) {
            $order['status'] = $status;
            $found = true;
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        return;
    }

    if (file_put_contents(DB_FILE, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update']);
    }
}

// ─── Update product inventory (admin) ────────────────────────────────────────

function updateProduct() {
    if (!requireAdminKey()) return;

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'], $input['inventory'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    if (!file_exists(PRODUCTS_FILE)) {
        http_response_code(404);
        echo json_encode(['error' => 'Products file not found']);
        return;
    }

    $products = json_decode(file_get_contents(PRODUCTS_FILE), true);
    foreach ($products as &$product) {
        if ($product['id'] == $input['id']) {
            $product['inventory'] = intval($input['inventory']);
            break;
        }
    }

    if (file_put_contents(PRODUCTS_FILE, json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['success' => true, 'message' => 'Product updated']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update product']);
    }
}

// ─── Send email notification ─────────────────────────────────────────────────

function sendOrderEmail($order) {
    $subject = '🛍️ طلب جديد #' . $order['id'] . ' - FOREVER Store';

    $rows = '';
    foreach ($order['items'] as $item) {
        $rows .= '<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">' . $item['name'] . '</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">' . $item['qty'] . '</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">' . $item['price'] . ' درهم</td>
        </tr>';
    }

    $message = '
    <html dir="rtl"><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <div style="background:#c8536e;padding:20px 30px;">
          <h2 style="color:#fff;margin:0;">🛍️ طلب جديد وصل!</h2>
          <p style="color:#f9d5de;margin:5px 0 0;">رقم الطلب: <strong>' . $order['id'] . '</strong></p>
        </div>
        <div style="padding:25px 30px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#888;width:130px;">الاسم</td><td style="padding:6px 0;font-weight:bold;">' . $order['name'] . '</td></tr>
            <tr><td style="padding:6px 0;color:#888;">الهاتف</td><td style="padding:6px 0;font-weight:bold;">' . $order['phone'] . '</td></tr>
            <tr><td style="padding:6px 0;color:#888;">المدينة</td><td style="padding:6px 0;">' . $order['city'] . '</td></tr>
            <tr><td style="padding:6px 0;color:#888;">العنوان</td><td style="padding:6px 0;">' . $order['address'] . '</td></tr>
            <tr><td style="padding:6px 0;color:#888;">التاريخ</td><td style="padding:6px 0;">' . $order['created_at'] . '</td></tr>
          </table>
          <h3 style="color:#c8536e;border-bottom:2px solid #f9d5de;padding-bottom:8px;">المنتجات المطلوبة</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9f0f3;">
                <th style="padding:10px 12px;text-align:right;">المنتج</th>
                <th style="padding:10px 12px;text-align:center;">الكمية</th>
                <th style="padding:10px 12px;text-align:right;">السعر</th>
              </tr>
            </thead>
            <tbody>' . $rows . '</tbody>
          </table>
          <div style="background:#f9f0f3;padding:15px 20px;border-radius:8px;margin-top:20px;text-align:left;">
            <strong style="font-size:18px;color:#c8536e;">المجموع: ' . $order['total'] . ' درهم</strong>
          </div>
        </div>
        <div style="background:#f5f5f5;padding:15px 30px;text-align:center;color:#aaa;font-size:12px;">
          FOREVER Store &mdash; لوحة الإدارة: <a href="admin.html">admin.html</a>
        </div>
      </div>
    </body></html>';

    $headers  = 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
    $headers .= 'From: noreply@forever-store.ma' . "\r\n";

    mail(ADMIN_EMAIL, $subject, $message, $headers);
}
