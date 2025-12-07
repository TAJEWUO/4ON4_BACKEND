// src/utils/response.js
function ok(res, data = {}, status = 200) {
  return res.status(status).json({ ok: true, data });
}
function error(res, message = "Error", status = 400) {
  return res.status(status).json({ ok: false, message });
}
module.exports = { ok, error };
