# VERSA-KESSIA-WORLD

Uma aventura mobile 2.5D em estilo WebApp, onde Késsia atravessa uma floresta misteriosa resolvendo desafios matemáticos para iluminar lanternas, acender fogueiras e conquistar o topo do acampamento.

O projeto combina exploração, combate leve, clima dinâmico, atmosfera narrativa e aprendizado ativo em sessões curtas e acessíveis para celular.

## Visão geral

VERSA-KESSIA-WORLD é um jogo de desenvolvimento em curso inspirado em:

- exploração vertical em visão 2.5D
- gameplay mobile-first
- desafios matemáticos contextualizados
- estética de floresta mística com iluminação bioluminescente
- experiência instalável como PWA

A proposta principal é transformar raciocínio lógico em uma mecânica de progressão do mundo: cada cálculo correto ajuda a restaurar a luz da trilha.

## Funcionalidades

- 4 trilhas matemáticas:
  - Soma e subtração
  - Multiplicação e divisão
  - Geometria e perímetro/área
  - Trilha completa (mistura de operações)
- 7 cenários/climas distintos
- Sistema de progresso com lanternas, fogueira e barraca do topo
- HUD mobile com vida, calor, pontuação, progresso e objetivos
- Combate com inimigos da bruma, telégrafo visual e esquiva
- Sistema de partículas e iluminação atmosférica
- Áudio procedural e feedback de ação
- Layout responsivo para celular, com suporte ao modo PWA

## Loop de gameplay

1. O jogador escolhe a trilha matemática e o clima.
2. Késsia avança pela trilha e enfrenta criaturas da bruma.
3. Ao se aproximar de estações interativas, o jogo abre desafios matemáticos.
4. Acertos restauram calor, iluminam lanternas e desbloqueiam progressão.
5. Com lanternas e fogueira acesas, o jogador alcança o topo e conclui a missão.

## Controles

- Analógico virtual / toque na trilha para mover Késsia
- Botões de ação para calcular, atacar e dash
- Interação contextual ao tocar em estações e objetos da trilha
- Suporte a teclado para testes locais (quando em ambiente desktop):
  - M: silenciar/ativar áudio
  - V: ativar overlay QA
  - C: trocar cenário
  - R: reiniciar partida
  - Q: praticar desafio matemático

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- PWA via vite-plugin-pwa
- HTML5 Canvas / renderização customizada do mundo 2.5D
- Web Audio API

## Estrutura do projeto

```text
.
├── public/
│   ├── assets/
│   ├── apple-touch-icon.png
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-maskable-512x512.png
├── src/
│   ├── components/
│   ├── game/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── ...
├── .env.example
├── .gitignore
├── bun.lock
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── versavisual-vinicius_VERSA-KESSIA-WORLD_98bffc.json
└── README.md
```

## Como executar localmente

### Pré-requisitos

- Node.js 18+
- npm ou bun

### Instalação

```bash
npm install
```

Ou:

```bash
bun install
```

### Desenvolvimento

```bash
npm run dev
```

A aplicação será iniciada em:

```text
http://localhost:3000
```

### Build de produção

```bash
npm run build
```

### Preview da build

```bash
npm run preview
```

## PWA

O projeto foi estruturado para funcionar como WebApp instalável, com foco em mobile. Isso inclui:

- layout em portrait 9:16
- suporte a viewport mobile seguro
- icons para iOS/Android
- offline-friendly setup via PWA
- experiência próxima de app nativo

## Desenvolvimento e contribuição

O repositório está organizado em camadas de gameplay e interface:

- `src/App.tsx`: orquestra o fluxo principal da aplicação
- `src/components/`: telas, HUD e módulos de UI
- `src/game/`: lógica de regras, desafios, áudio, cenários e partículas

Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Faça as alterações
4. Valide o build com `npm run build`
5. Abra um pull request

## Status do projeto

Este repositório está em etapa de protótipo / MVP com foco em gameplay e experiência mobile. A base do jogo, das trilhas matemáticas e da estrutura de PWA já foram implementadas.

## Repositório

- GitHub: https://github.com/versavisual-vinicius/VERSA-KESSIA-WORLD

## Observação

Este README foi criado para documentar a visão de produto, arquitetura e execução do projeto com base na estrutura atual do repositório e no conceito de jogo descrito no material do projeto.
