"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../src/db/prisma");
async function main() {
    const email = "levi@test.com"; // <-- change
    const newPassword = "Admin@12345"; // <-- change
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        throw new Error("User not found");
    const passwordHash = await bcrypt_1.default.hash(newPassword, 12);
    await prisma_1.prisma.user.update({
        where: { email },
        data: { passwordHash },
    });
    console.log("✅ Password reset done");
    console.log("Email:", email);
    console.log("New password:", newPassword);
}
main()
    .catch(console.error)
    .finally(() => prisma_1.prisma.$disconnect());
