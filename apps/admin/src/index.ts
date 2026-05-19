export const adminPanelScaffold = {
  name: "Lumorix: Null District Admin",
  status: "api-first scaffold",
  endpoints: [
    "GET /api/admin/users",
    "POST /api/admin/ban",
    "POST /api/admin/unban",
    "POST /api/admin/grant-currency",
    "POST /api/admin/grant-cosmetic/:userId/:cosmeticId",
    "GET /api/admin/audit-logs",
    "GET /api/admin/purchases",
    "POST /api/admin/shop-products",
    "POST /api/admin/shop-products/:productId/disable"
  ]
};
