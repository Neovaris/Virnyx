import bcrypt from "bcrypt";
import { prisma } from "../src/db/prisma";

async function main() {
  const email = "levi@test.com";         // <-- change
  const newPassword = "Admin@12345";     // <-- change

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log("✅ Password reset done");
  console.log("Email:", email);
  console.log("New password:", newPassword);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());