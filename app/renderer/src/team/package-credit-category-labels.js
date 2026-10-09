// package-credit-category-labels.js

const PACKAGE_CREDIT_CATEGORY_LABELS = {
  subscription: {
    key: "credits.transaction.category.subscription",
    fallback: "Subscription credit",
  },
  top_up: {
    key: "credits.transaction.category.topUp",
    fallback: "Top-up credit",
  },
  gift: {
    key: "credits.transaction.category.gift",
    fallback: "Gift credit",
  },
};

export function getPackageCreditCategoryLabel(creditCategory, t2) {
  const category = PACKAGE_CREDIT_CATEGORY_LABELS[creditCategory ?? ""];
  if (!category) return void 0;
  return category.key && t2
    ? t2(category.key, {
        defaultValue: category.fallback,
      })
    : category.fallback;
}
