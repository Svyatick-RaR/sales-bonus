/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // ВАЖНО: используем sale_price из purchase (чека), НЕ из product!
  const { discount, sale_price, quantity } = purchase;
  return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === total - 1) {
    return 0;
  } else if (index === 0) {
    return +(profit * 0.15).toFixed(2);
  } else if (index === 1 || index === 2) {
    return +(profit * 0.1).toFixed(2);
  } else {
    return +(profit * 0.05).toFixed(2);
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {Array}
 */
function analyzeSalesData(data, options) {
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  if (!options || typeof options !== "object") {
    throw new Error("Отсутствуют опции");
  }

  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Отсутствуют необходимые функции расчета");
  }

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });

  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      const revenue = calculateRevenue(item, product);
      const cost = product.purchase_price * item.quantity;
      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }

      seller.products_sold[item.sku] += item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStats.length;

  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller);

    const productsArray = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku: sku,
        quantity: quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    seller.top_products = productsArray;
  });
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
