-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('contrato_assinado', 'comprovante_pagamento', 'proposta', 'documento_cliente', 'outros');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contratoAssinadoEm" TIMESTAMP(3),
ADD COLUMN     "contratoAssinadoPorAmbasPartes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "observacaoContrato" TEXT;

-- CreateTable
CREATE TABLE "ClientDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "tipo" "DocumentType" NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "enviadoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_enviadoPor_fkey" FOREIGN KEY ("enviadoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
