"use strict";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, error: msg });

function notFound(res, entity = "Data") {
  return err(res, `${entity} tidak ditemukan`, 404);
}

function validate(schema) {
  return (req, res, next) => {
    const body = req.body || {};
    for (const [field, rule] of Object.entries(schema)) {
      if (rule.required && (body[field] === undefined || body[field] === null || body[field] === "")) {
        return err(res, `Field '${field}' wajib diisi`);
      }
      if (rule.enum && body[field] && !rule.enum.includes(body[field])) {
        return err(res, `Field '${field}' harus salah satu dari: ${rule.enum.join(", ")}`);
      }
      if (rule.maxLength && body[field] && body[field].length > rule.maxLength) {
        return err(res, `Field '${field}' maksimal ${rule.maxLength} karakter`);
      }
    }
    next();
  };
}

// Simple request logger
function logger(req, _res, next) {
  const t = new Date().toISOString().slice(11,19);
  console.log(`[${t}] ${req.method.padEnd(6)} ${req.path}`);
  next();
}

module.exports = { ok, err, notFound, validate, logger };
