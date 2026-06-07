import path from 'path';
import { Request, Response } from 'express';
import multer from 'multer';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/errors';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.includes(file.mimetype)) return cb(new AppError(400, 'Formato de arquivo não permitido.'));
    cb(null, true);
  }
});

export function uploaded(req: Request, res: Response) {
  if (!req.file) throw new AppError(400, 'Arquivo não enviado.');
  return ok(res, { url: path.join('/', uploadDir, req.file.filename), originalName: req.file.originalname }, 'Upload realizado com sucesso');
}
