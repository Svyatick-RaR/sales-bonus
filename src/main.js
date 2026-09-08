/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет выручки с учетом скидки
  const { discount, sale_price, quantity } = purchase;
  const discountFactor = 1 - discount / 100;
  return sale_price * quantity * discountFactor;
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
  let percent = 0;

  if (index === 0) {
    percent = 15; // Первое место
  } else if (index === 1 || index === 2) {
    percent = 10; // Второе и третье место
  } else if (index === total - 1) {
    percent = 0; // Последнее место
  } else {
    percent = 5; // Все остальные
  }

  return profit * (percent / 100);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {Array}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
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

  // @TODO: Проверка наличия опций
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

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });

  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // @TODO: Расчёт выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    // Увеличиваем количество продаж
    seller.sales_count += 1;

    // Обрабатываем каждый товар в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      // Рассчитываем выручку с учетом скидки
      const revenue = calculateRevenue(item, product);

      // Рассчитываем себестоимость
      const cost = product.purchase_price * item.quantity;

      // Прибыль = выручка - себестоимость
      const profit = revenue - cost;

      // Добавляем к общей выручке и прибыли продавца
      seller.revenue += revenue;
      seller.profit += profit;

      // Учет количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  const totalSellers = sellerStats.length;

  sellerStats.forEach((seller, index) => {
    // Рассчитываем бонус
    seller.bonus = calculateBonus(index, totalSellers, seller);

    // @TODO: Формируем топ-10 продуктов
    const productsArray = Object.entries(seller.products_sold).map(
      ([sku, quantity]) => ({
        sku: sku,
        quantity: quantity,
      }),
    );

    productsArray.sort((a, b) => b.quantity - a.quantity);
    seller.top_products = productsArray.slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
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
