// Preset padrão do Expo (mesmo que o Metro já usa por baixo). Necessário para o
// babel-jest transformar os módulos nos testes. Não altera o build do app.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
