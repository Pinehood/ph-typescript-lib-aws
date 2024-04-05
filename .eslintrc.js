module.exports = {
  extends: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "eslint-config-ts-ph",
  ],
  rules: {
    "@typescript-eslint/no-namespace": "off",
  },
};
