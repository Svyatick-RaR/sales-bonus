/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
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
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else {
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {Array}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
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

  // Проверка опций
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

  // Подготовка статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // Индексы
  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });

  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // Обработка чеков
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      // Выручка через calculateRevenue (НЕ используем total_amount!)
      const revenue = calculateRevenue(item, product);

      // Себестоимость
      const cost = product.purchase_price * item.quantity;

      // Прибыль
      const profit = revenue - cost;

      seller.revenue += revenue;
      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортировка по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Расчет бонусов и топ-10
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

  // Формирование результата
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: parseFloat(seller.revenue.toFixed(2)),
    profit: parseFloat(seller.profit.toFixed(2)),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: parseFloat(seller.bonus.toFixed(2)),
  }));
}
