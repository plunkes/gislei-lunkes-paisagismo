'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

/** Diretório físico onde as imagens são gravadas (backend/uploads). */
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Garante a existência da pasta de uploads na inicialização.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** Extensões/MIME types de imagem aceitos. */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

/** Limite de tamanho por arquivo: 5 MB. */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // Nome único: timestamp + bytes aleatórios, preservando a extensão original.
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

/**
 * Aceita exclusivamente arquivos de imagem. Rejeita o restante com 400.
 * @type {import('multer').Options['fileFilter']}
 */
function imageFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new ApiError(400, 'Apenas arquivos de imagem são permitidos (JPEG, PNG, WebP, GIF, AVIF).'));
}

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

/**
 * Middleware para upload de uma única imagem no campo `image`. Converte erros
 * do Multer (ex.: arquivo grande demais) em {@link ApiError} para o handler
 * central de erros responder com JSON padronizado.
 * @type {import('express').RequestHandler}
 */
function uploadSingleImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Imagem excede o limite de 5 MB.'
          : `Falha no upload: ${err.message}`;
      return next(new ApiError(400, msg));
    }
    return next(err); // ApiError do fileFilter ou erro inesperado.
  });
}

module.exports = { uploadSingleImage, UPLOADS_DIR, MAX_FILE_SIZE };
