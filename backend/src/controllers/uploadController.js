'use strict';

const ApiError = require('../utils/ApiError');

/**
 * POST /api/backoffice/uploads — recebe uma imagem (campo `image`, multipart)
 * já gravada em disco pelo middleware Multer e devolve a URL pública relativa.
 *
 * Funcionário autenticado. O frontend usa a URL retornada como `imageUrl` do
 * produto.
 *
 * @type {import('express').RequestHandler}
 */
async function uploadImage(req, res) {
  if (!req.file) {
    throw new ApiError(400, 'Nenhum arquivo enviado no campo "image".');
  }

  // URL relativa servida por `app.use('/uploads', express.static(...))`.
  const url = `/uploads/${req.file.filename}`;

  res.status(201).json({
    url,
    filename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
}

module.exports = { uploadImage };
