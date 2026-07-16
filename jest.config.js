// Testes de LÓGICA PURA (nutrition, stats, drafts, datas…). Os módulos testados
// só importam tipos de RN/Firebase (`import type`, apagados em runtime), então
// rodam em Node sem precisar do ambiente React Native.
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
