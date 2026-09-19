-- CreateTable
CREATE TABLE "ProductActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'app',
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ProductActivity_shop_productId_idx" ON "ProductActivity"("shop", "productId");

-- CreateIndex
CREATE INDEX "ProductActivity_shop_createdAt_idx" ON "ProductActivity"("shop", "createdAt");
