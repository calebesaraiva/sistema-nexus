-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('dinheiro', 'permuta', 'misto');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChargeStatus" ADD VALUE 'compensada';
ALTER TYPE "ChargeStatus" ADD VALUE 'parcial';

-- AlterEnum
ALTER TYPE "ChargeType" ADD VALUE 'permuta';

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "descricaoPermuta" TEXT,
ADD COLUMN     "observacoesPermuta" TEXT,
ADD COLUMN     "parceiroPermuta" TEXT,
ADD COLUMN     "prazoPermuta" TIMESTAMP(3),
ADD COLUMN     "statusPermuta" "ChargeStatus",
ADD COLUMN     "tipoRecebimento" "ReceiptType" NOT NULL DEFAULT 'dinheiro',
ADD COLUMN     "valorPermuta" DECIMAL(65,30) NOT NULL DEFAULT 0;
