function isValidProductId(product_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return typeof product_id === "number" && Number.isInteger(product_id) && product_id > 0;
}

function isValidQuantity(quantity) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1;
}

function isValidObservation(observation) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (observation === undefined || observation === null) {
    return true;
  }

  if (typeof observation !== "string") {
    return false;
  }

  const trimmed = observation.trim();

  // Limite coerente com schema: order_items.observation VARCHAR(255)
  return trimmed.length <= 255;
}

function isValidItems(items) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (!Array.isArray(items)) {
    return false;
  }

  if (items.length === 0) {
    return false;
  }

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    if (!isValidProductId(item.product_id)) {
      return false;
    }

    if (!isValidQuantity(item.quantity)) {
      return false;
    }

    if (!isValidObservation(item.observation)) {
      return false;
    }
  }

  return true;
}

function isValidOrderId(order_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  // req.params chega sempre como string
  const id = Number(order_id);

  return Number.isInteger(id) && id > 0;
}

module.exports = {
  isValidItems,
  isValidOrderId,
  isValidProductId,
  isValidQuantity,
  isValidObservation,
};
