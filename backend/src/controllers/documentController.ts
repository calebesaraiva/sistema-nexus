import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import { DocumentType } from '@prisma/client';
import { prisma } from '../prisma';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/errors';
import { audit } from '../services/auditService';
import { paramId } from '../utils/params';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 10);
const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const documentTypes = ['contrato_assinado', 'comprovante_pagamento', 'proposta', 'documento_cliente', 'outros'];

function safeFileName(original: string) {
  const ext = path.extname(original).toLowerCase();
  const base = path.basename(original, ext).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
  return `${base || 'documento'}-${Date.now()}${ext}`;
}

export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, safeFileName(file.originalname))
  }),
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const type = String(req.body.tipo || '');
    if (type === 'contrato_assinado' && file.mimetype !== 'application/pdf') return cb(new AppError(400, 'Contrato assinado deve ser enviado em PDF.'));
    if (!allowedMimeTypes.includes(file.mimetype)) return cb(new AppError(400, 'Formato de arquivo não permitido.'));
    cb(null, true);
  }
});

export async function listClientDocuments(req: Request, res: Response) {
  const documents = await prisma.clientDocument.findMany({
    where: { clientId: paramId(req.params.clientId) },
    include: { uploader: { select: { id: true, nome: true, email: true } }, contract: { select: { id: true, titulo: true } } },
    orderBy: { criadoEm: 'desc' }
  });
  return ok(res, documents);
}

export async function createClientDocument(req: Request, res: Response) {
  if (!req.file) throw new AppError(400, 'Arquivo não enviado.');
  const clientId = paramId(req.params.clientId);
  const tipo = String(req.body.tipo || 'outros') as DocumentType;
  if (!documentTypes.includes(tipo)) throw new AppError(400, 'Tipo de documento inválido.');
  if (tipo === 'contrato_assinado' && req.file.mimetype !== 'application/pdf') throw new AppError(400, 'Contrato assinado deve ser enviado em PDF.');
  const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
  if (!client) throw new AppError(404, 'Cliente não encontrado.');
  const contractId = req.body.contractId ? String(req.body.contractId) : undefined;
  if (contractId) {
    const contract = await prisma.contract.findFirst({ where: { id: contractId, clientId } });
    if (!contract) throw new AppError(404, 'Contrato não encontrado para este cliente.');
  }
  const document = await prisma.clientDocument.create({
    data: {
      clientId,
      contractId,
      tipo,
      nomeArquivo: req.file.originalname,
      url: path.join('/', uploadDir, req.file.filename).replace(/\\/g, '/'),
      mimeType: req.file.mimetype,
      tamanho: req.file.size,
      enviadoPor: req.user?.id
    }
  });
  await audit(req, 'Documento anexado', 'ClientDocument', document.id, { clientId, contractId, tipo, nomeArquivo: document.nomeArquivo });
  return ok(res, document, 'Documento anexado com sucesso');
}

export async function downloadDocument(req: Request, res: Response) {
  const document = await prisma.clientDocument.findUnique({ where: { id: paramId(req.params.id) } });
  if (!document) throw new AppError(404, 'Documento não encontrado.');
  const absolutePath = path.resolve(document.url.replace(/^\//, ''));
  if (!fs.existsSync(absolutePath)) throw new AppError(404, 'Arquivo não encontrado no servidor.');
  await audit(req, 'Documento baixado', 'ClientDocument', document.id, { nomeArquivo: document.nomeArquivo, tipo: document.tipo });
  return res.download(absolutePath, document.nomeArquivo);
}

export async function deleteDocument(req: Request, res: Response) {
  const document = await prisma.clientDocument.findUnique({ where: { id: paramId(req.params.id) } });
  if (!document) throw new AppError(404, 'Documento não encontrado.');
  await prisma.clientDocument.delete({ where: { id: document.id } });
  const absolutePath = path.resolve(document.url.replace(/^\//, ''));
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
  await audit(req, 'Documento excluído', 'ClientDocument', document.id, { nomeArquivo: document.nomeArquivo, tipo: document.tipo });
  return ok(res, null, 'Documento excluído com sucesso');
}
