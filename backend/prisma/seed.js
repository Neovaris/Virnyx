"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// prisma/seed.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DEFAULT_ROLE_NAMES = ["ADMIN", "MANAGER", "CASHIER"];
// Define all permissions in the system
const ALL_PERMISSIONS = [
    // Users & Roles
    { key: "users:read", description: "View users" },
    { key: "users:write", description: "Create, update, delete users" },
    // Discounts
    { key: "discounts:read", description: "View discount rules" },
    { key: "discounts:write", description: "Create, update, delete discount rules" },
    // Settings
    { key: "settings:read", description: "View merchant settings" },
    { key: "settings:write", description: "Update merchant settings" },
    // Sales
    { key: "sales:read", description: "View sales" },
    { key: "sales:write", description: "Process sales and refunds" },
    // Products & Inventory
    { key: "products:read", description: "View products" },
    { key: "products:write", description: "Create, update, delete products" },
    { key: "inventory:read", description: "View inventory" },
    { key: "inventory:write", description: "Update inventory" },
    // Reports
    { key: "reports:read", description: "View reports" },
    // Receipts
    { key: "receipts:read", description: "View receipts" },
];
// Define role permissions (which permissions each role has)
const ROLE_PERMISSIONS = {
    ADMIN: [
        "users:read",
        "users:write",
        "discounts:read",
        "discounts:write",
        "settings:read",
        "settings:write",
        "sales:read",
        "sales:write",
        "products:read",
        "products:write",
        "inventory:read",
        "inventory:write",
        "reports:read",
        "receipts:read",
    ],
    MANAGER: [
        "discounts:read",
        "discounts:write",
        "settings:read",
        "sales:read",
        "sales:write",
        "products:read",
        "products:write",
        "inventory:read",
        "inventory:write",
        "reports:read",
        "receipts:read",
    ],
    CASHIER: [
        "discounts:read",
        "sales:read",
        "sales:write",
        "products:read",
        "inventory:read",
        "receipts:read",
    ],
};
async function ensurePermissions() {
    for (const perm of ALL_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { key: perm.key },
            update: { description: perm.description },
            create: { key: perm.key, description: perm.description },
        });
    }
    console.log("✅ Permissions ensured");
}
async function ensureRolesForMerchant(merchantId) {
    for (const roleName of DEFAULT_ROLE_NAMES) {
        const role = await prisma.role.upsert({
            where: {
                merchantId_name: { merchantId, name: roleName },
            },
            update: {},
            create: { merchantId, name: roleName },
        });
        // Get permissions for this role
        const permissionKeys = ROLE_PERMISSIONS[roleName] || [];
        // Clear existing permissions
        await prisma.rolePermission.deleteMany({
            where: { roleId: role.id },
        });
        // Add new permissions
        for (const permKey of permissionKeys) {
            const permission = await prisma.permission.findUnique({
                where: { key: permKey },
            });
            if (permission) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }
}
async function main() {
    // First, ensure all permissions exist
    await ensurePermissions();
    // Then ensure roles and their permissions for each merchant
    const merchants = await prisma.merchant.findMany({ select: { id: true } });
    for (const m of merchants) {
        await ensureRolesForMerchant(m.id);
    }
    console.log("✅ Roles and permissions ensured for all merchants");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
