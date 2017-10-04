module.exports = {
  "env": {
    "node": true,
    "es6": true
  },
  "extends": ['plugin:chronobank/recommended'],
  "rules": {
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-console": 1,
    "no-unused-vars": 1,
    "no-empty": ["error", { "allowEmptyCatch": true }]
  },
  "parserOptions": {
    "ecmaVersion": 8
  }
};