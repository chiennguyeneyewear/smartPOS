import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "@smartpos/shared";

const prisma = new PrismaClient();

const CATEGORY_NAMES = ["Đồ uống", "Bánh kẹo", "Gia dụng", "Văn phòng phẩm", "Thực phẩm khô"];
const UNIT_NAMES = ["Cái", "Hộp", "Chai", "Gói", "Kg", "Thùng"];

const PRODUCT_NAMES = [
  "Nước suối Aquafina 500ml",
  "Coca Cola lon 330ml",
  "Pepsi lon 330ml",
  "Bánh Oreo 137g",
  "Kẹo Alpenliebe gói",
  "Snack Oishi 40g",
  "Mì Hảo Hảo tôm chua cay",
  "Sữa tươi Vinamilk 1L",
  "Sữa đặc Ông Thọ lon",
  "Cà phê G7 hòa tan hộp",
  "Trà xanh không độ 500ml",
  "Dầu ăn Neptune 1L",
  "Nước mắm Nam Ngư 500ml",
  "Đường trắng Biên Hòa 1kg",
  "Bột giặt Omo 720g",
  "Nước rửa chén Sunlight 750ml",
  "Giấy vệ sinh Pulppy 10 cuộn",
  "Bàn chải đánh răng Colgate",
  "Kem đánh răng PS 200g",
  "Xà phòng tắm Lifebuoy 90g",
  "Bút bi Thiên Long",
  "Vở học sinh 96 trang",
  "Sổ tay A5",
  "Băng dính đen 17x32mm",
  "Pin AA Panasonic vỉ 4 viên",
  "Gạo ST25 túi 5kg",
  "Trứng gà hộp 10 quả",
  "Dầu gội Clear 650ml",
  "Nước ngọt Sting dâu 330ml",
  "Bánh mì sandwich Kinh Đô",
];

async function main() {
  console.log("Seeding database...");

  // Permissions
  const permissionRecords = await Promise.all(
    Object.values(PERMISSIONS).map((id) =>
      prisma.permission.upsert({ where: { id }, update: {}, create: { id, label: id } }),
    ),
  );
  const permissionById = new Map(permissionRecords.map((p) => [p.id, p]));

  // Roles
  for (const roleName of Object.values(ROLES)) {
    const perms = ROLE_PERMISSIONS[roleName];
    await prisma.role.upsert({
      where: { name: roleName },
      update: { permissions: { set: perms.map((p) => ({ id: permissionById.get(p)!.id })) } },
      create: {
        name: roleName,
        permissions: { connect: perms.map((p) => ({ id: permissionById.get(p)!.id })) },
      },
    });
  }
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.ADMIN } });
  const cashierRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.CASHIER } });

  // Branches
  const branch1 = await prisma.branch.upsert({
    where: { code: "CN01" },
    update: {},
    create: { name: "Chi nhánh trung tâm", code: "CN01", address: "123 Nguyễn Huệ, Q1, TP.HCM", phone: "0334016852" },
  });
  const branch2 = await prisma.branch.upsert({
    where: { code: "CN02" },
    update: {},
    create: { name: "Chi nhánh Thủ Đức", code: "CN02", address: "45 Võ Văn Ngân, TP. Thủ Đức", phone: "0334016853" },
  });

  // Users
  const adminPasswordHash = await argon2.hash("Admin@123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@smartpos.vn" },
    update: {},
    create: {
      email: "admin@smartpos.vn",
      passwordHash: adminPasswordHash,
      fullName: "Quản trị viên",
      roleId: adminRole.id,
      defaultBranchId: branch1.id,
      branches: { create: [{ branchId: branch1.id }, { branchId: branch2.id }] },
    },
  });

  const cashierPasswordHash = await argon2.hash("Cashier@123");
  const cashier = await prisma.user.upsert({
    where: { email: "cashier@smartpos.vn" },
    update: {},
    create: {
      email: "cashier@smartpos.vn",
      passwordHash: cashierPasswordHash,
      fullName: "Thu ngân Chi nhánh 1",
      roleId: cashierRole.id,
      defaultBranchId: branch1.id,
      branches: { create: [{ branchId: branch1.id }] },
    },
  });

  // Units
  const units = await Promise.all(
    UNIT_NAMES.map((name) => prisma.unit.upsert({ where: { name }, update: {}, create: { name } })),
  );

  // Categories
  const categories = await Promise.all(
    CATEGORY_NAMES.map((name) =>
      prisma.category.findFirst({ where: { name } }).then((existing) =>
        existing ? existing : prisma.category.create({ data: { name } }),
      ),
    ),
  );

  // Products
  const products = [];
  for (let i = 0; i < PRODUCT_NAMES.length; i++) {
    const name = PRODUCT_NAMES[i]!;
    const sku = `SP${String(i + 1).padStart(4, "0")}`;
    const costPrice = 5000 + Math.round(Math.random() * 45000);
    const sellPrice = costPrice + 3000 + Math.round(Math.random() * 15000);
    const unit = units[i % units.length]!;
    const category = categories[i % categories.length]!;
    const product = await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        sku,
        barcode: `89${String(1000000000 + i).slice(0, 11)}`,
        name,
        unitId: unit.id,
        categoryId: category.id,
        costPrice,
        sellPrice,
        reorderThreshold: 10,
      },
    });
    products.push(product);
  }

  // Initial stock per branch
  for (const branch of [branch1, branch2]) {
    for (const product of products) {
      const quantity = 20 + Math.round(Math.random() * 80);
      await prisma.stockItem.upsert({
        where: { productId_branchId: { productId: product.id, branchId: branch.id } },
        update: { quantity },
        create: { productId: product.id, branchId: branch.id, quantity },
      });
    }
  }

  // Customers
  const customerData = [
    { name: "Nguyễn Văn A", phone: "0901111111" },
    { name: "Trần Thị B", phone: "0902222222" },
    { name: "Lê Văn C", phone: "0903333333" },
    { name: "Phạm Thị D", phone: "0904444444" },
  ];
  for (let i = 0; i < customerData.length; i++) {
    const c = customerData[i]!;
    await prisma.customer.upsert({
      where: { code: `KH${String(i + 1).padStart(6, "0")}` },
      update: {},
      create: { code: `KH${String(i + 1).padStart(6, "0")}`, name: c.name, phone: c.phone },
    });
  }

  // Suppliers
  const supplierData = [
    { name: "Công ty TNHH Phân phối Miền Nam", phone: "0281111111" },
    { name: "Nhà cung cấp Thực phẩm An Bình", phone: "0282222222" },
  ];
  for (let i = 0; i < supplierData.length; i++) {
    const s = supplierData[i]!;
    await prisma.supplier.upsert({
      where: { code: `NCC${String(i + 1).padStart(6, "0")}` },
      update: {},
      create: { code: `NCC${String(i + 1).padStart(6, "0")}`, name: s.name, phone: s.phone },
    });
  }

  console.log("Seed hoàn tất.");
  console.log(`Admin: admin@smartpos.vn / Admin@123`);
  console.log(`Cashier: cashier@smartpos.vn / Cashier@123`);
  console.log(`Branches: ${branch1.name}, ${branch2.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
