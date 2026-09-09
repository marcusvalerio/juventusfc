# Modelo 3D do mascote

Coloque aqui o arquivo:

```
juventus-mascot.glb
```

Nada mais precisa ser alterado. `Mascot3D` consulta este caminho no carregamento
(`HEAD /models/juventus-mascot.glb`) e, ao encontrar um arquivo real, carrega a
camada WebGL sob demanda e passa a renderizar o modelo no lugar da composição
estática. Enquanto o arquivo não existir, o Three.js não é baixado.

Para apontar para outro caminho, defina `VITE_MASCOT_MODEL_URL` no build.

## O que o componente espera do modelo

- **GLB ou glTF binário.** Draco e Meshopt são aceitos.
- **Escala, origem e enquadramento livres.** O modelo é medido no carregamento e
  ajustado à cena: pés no chão, centralizado, sempre com a mesma altura em tela.
- **Materiais PBR.** A iluminação é montada com a paleta do clube (chave
  off-white, recorte dourado, preenchimento baixo) e não usa mapa de ambiente,
  então nada é buscado em terceiros.
- **Orçamento.** Alvo de algumas dezenas de milhares de triângulos e texturas de
  até 2K; o arquivo é baixado sob demanda, mas ainda assim entra no caminho do
  hero.

Um GLB inválido ou corrompido não quebra a tela: o componente registra a falha
e volta para a composição estática.
