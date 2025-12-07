// src/utils/categories.js

// CATEGORIES quick reference
// C1: public + private (both) -> shown to all
// C2: public
// C3: private (owner only)
// C4: optional
// C5: yes/no
// C6: text
// C7: public image
// C8: private image
// C9: secured private

const isOwner = (ownerId, requesterId) => {
  if (!ownerId || !requesterId) return false;
  return String(ownerId) === String(requesterId);
};

// generic filter: accepts an object that may contain fields with .displayCategory
function filterFieldsForRequester(obj, ownerId, requesterId) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // if value is an object with displayCategory
    if (v && typeof v === "object" && v.displayCategory) {
      const cat = v.displayCategory;
      if (cat === "C2" || cat === "C1" || cat === "C7") {
        out[k] = v.value ?? v.path ?? v;
      } else if (cat === "C3" || cat === "C8" || cat === "C9") {
        if (isOwner(ownerId, requesterId)) {
          out[k] = v.value ?? v.path ?? v;
        } // else omit
      } else {
        // default: include
        out[k] = v.value ?? v.path ?? v;
      }
    } else {
      // plain value - include by default
      out[k] = v;
    }
  }
  return out;
}

module.exports = { filterFieldsForRequester };
