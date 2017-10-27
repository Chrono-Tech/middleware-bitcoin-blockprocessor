module.exports = {
  "env": {
    "node": true,
    "es6": true
  },
  "extends": ["eslint:recommended"],
  "rules": {
    "indent": [
      "error", 2, {
        "SwitchCase": 1
      }
    ],
    "quotes": ["error", "single"],
    "camelcase": ["error", {properties: "always"}],
    "semi": ["error", "always"],
    "no-console": 1,
    "no-unused-vars": 1,
    "no-empty": ["error", {"allowEmptyCatch": true}]
  },
  "parserOptions": {
    "ecmaVersion": 8
  }
};