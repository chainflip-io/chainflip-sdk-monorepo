-- CreateTable
CREATE TABLE "private"."BlacklistedIp" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistedIp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedIp_ip_key" ON "private"."BlacklistedIp"("ip");
