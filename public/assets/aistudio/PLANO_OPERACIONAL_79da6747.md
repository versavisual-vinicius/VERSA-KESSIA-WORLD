# PLANO OPERACIONAL DE PRODUÇÃO — GAME 2.5D MOBILE

**Contrato:** v1.0 | **Fonte:** 7 renders gerados (941 × 1672 px) | **Estado:** planejamento e scaffolds; nenhuma camada/sprite/máscara foi extraída.

## 1. Premissas e limites

- As imagens são **ilustrações rasterizadas**, não fontes de geometria, profundidade, rig ou colisão. A extração automática é proposta, não comprovada.
- **Não assumir que os 7 cenários são pixel-identical.** A composição varia: só compartilhar um objeto quando sua perspectiva, iluminação e dimensões passarem no teste de compatibilidade; senão criar variante por cena.
- Coordenadas, máscaras, zonas navegáveis e colisões exigem marcação/QA; os 7 JSONs entregues são **templates vazios válidos**, não mapas jogáveis.
- Render base 941×1672 (~9:16). Normalizar layout de jogo por viewport virtual com `contain`/câmera, sem esticar. Os arquivos de 249×2048 são referência original estreita e **não** devem ser reamostrados como background completo.
- A pintura 2.5D é perspectiva ilustrada, não mundo 3D métrico. O eixo `y` serve como heurística de ordenação dentro de um mesmo plano; elementos elevados/ponte precisam de exceções.

## 2. Inventário de fontes verificado

| ID | Arquivo base | Clima | FX candidatos |
|---|---|---|---|
| `night` | `acampamento_sob_a_lua_cheia.png` | lua cheia | stars, moonGlow, fire, fireflies |
| `rain` | `chuva_no_acampamento_da_floresta.png` | chuva | rain, ripples, splashes, wetSheen |
| `snow` | `acampamento_nevado_na_floresta.png` | neve | snowfall, snowDrift, breath |
| `day_golden` | `acampamento_encantado_na_floresta_dourada.png` | dia dourado | sunRays, dust, fire |
| `sunset` | `golden_hour_forest_camp_adventure.png` | pôr do sol | sunRays, bloom, dust |
| `day_forest` | `trilha_encantada_no_acampamento_da_floresta.png` | dia floresta | waterFlow, fire, leafParticles |
| `mist` | `acampamento_nebuloso_ao_amanhecer.png` | amanhecer com neblina | fogNear, fogFar, sunRays |

**Controle de integridade:** `source-manifest.json` registra hash SHA-256, dimensões e status. O arquivo `imagegen.png` está presente mas não foi incluído como oitava cena.

## 3. Biblioteca canônica — inventário asset por asset

| Código | Asset | Quantidade inicial planejada | Origem / tratamento | Runtime | Colisão |
|---|---|---:|---|---|---|
| BG-001 | céu / astro / montanha distante | 1–3 por cena | reconstruir fundo oculto; separar somente se houver parallax real | WebP | não |
| BG-002 | árvores distantes | 1–2 por cena | reconstrução + recorte | WebP alpha | não |
| GR-001 | chão e trilha limpa | 1 por cena | inpainting sem personagem/props | WebP | máscara independente |
| GR-002 | paredões e barrancos | 1–3 por cena | fundo ou layer oclusora | WebP alpha | polígono |
| WA-001 | base do riacho | 1 por cena | manter base, segmentar área | WebP | bloqueio parcial |
| WA-002 | espuma e brilhos de água | 1–3 por cena | sprites/flow overlay | WebP alpha | não |
| PR-001 | barraca laranja/azul | por ocorrência compatível | segmentar e reconstruir atrás | atlas WebP/PNG | polígono de base |
| PR-002 | anel de pedras da fogueira | por ocorrência | separar pedras e chama | atlas | círculo/polígono |
| PR-003 | chama e brasa | 1 preset global + variação | spritesheet / partícula | atlas | não |
| PR-004 | troncos/bancos | variantes visíveis | máscara alpha por objeto | atlas | retângulo/polígono |
| PR-005 | mochila | variantes visíveis | máscara alpha | atlas | opcional |
| PR-006 | lanterna | variantes visíveis | alpha + glow separado | atlas | opcional |
| PR-007 | ponte de madeira | variante por cena | segmento visual + zonas de entrada/saída | atlas/layer | travessia dirigida |
| PR-008 | tocos/placas | variantes visíveis | alpha | atlas | conforme dimensão |
| VE-001 | pinheiros (baixo/médio/alto) | biblioteca inicial 3 formas | recorte/regeneração coerente | atlas | tronco apenas |
| VE-002 | árvores de copa redonda | biblioteca inicial 2 formas | recorte/regeneração | atlas | tronco apenas |
| VE-003 | arbustos | biblioteca inicial 3 formas | recorte | atlas | sem colisão ou pequena |
| VE-004 | samambaias/grama | biblioteca inicial 3 manchas | recorte | atlas | não |
| VE-005 | flores | biblioteca inicial 3 manchas | recorte | atlas | não |
| RO-001 | pedras (P/M/G) | biblioteca inicial 3 formas | recorte | atlas | por base |
| AN-001 | pássaro/esquilo | apenas se visualmente consistente | recorte / sprites opcionais | atlas | não |
| CH-001 | personagem exploração | 1 design mestre | redesenhar, remover fantasma do fundo | spritesheet | collider nos pés |
| FX-001 | chuva | preset rain | partículas runtime e respingos | shader/sprite | não |
| FX-002 | neve | preset snow | partículas runtime | shader/sprite | não |
| FX-003 | neblina | 2 planos | overlays leves transladáveis | WebP alpha | não |
| FX-004 | luz solar/lua | 2 presets | overlay + luz shader | shader/alpha | não |

**Quantidades são metas de biblioteca**, não contagens auditadas por instância. Contagens finais vêm do inventário espacial manual de cada render.

## 4. Regras para extração e paridade

1. **Inventariar** cada ocorrência e bounding box no render original. Registrar `sceneId`, `objectId`, `bboxPx`, `sourceHash`, `visiblePercent`, `occlusionNotes`.
2. **Segmentar** objetos com máscara revisada pixel a pixel nos contornos críticos (barraca, ponte, personagem, árvore frontal). Exportar PNG RGBA sem fundo, padding 4–8px para atlas.
3. **Reconstruir** o background através de inpainting na área removida, sem apagar detalhes adjacentes. Gerar máscara de alteração e imagem `clean`.
4. **Recompor** o render a partir de fundo + sprites na posição original; diferença perceptual no **set não alterado** deve ser zero, salvo conversão/compressão. Inspecionar bordas/halos e as emendas da pintura reconstruída.
5. **Marcar** geometria por polígonos e testar colisões, travessia da ponte e oclusão em viewport de celular. Não usar caixa delimitadora da copa como collider de árvore.
6. **Versionar** assets e mapas; registrar revisões por cena em `audit`.

### Gate de aceite da extração

- [ ] Nenhum personagem embutido remanescente no chão.
- [ ] Todas as áreas ocultas por objetos removidos têm reconstrução aprovada.
- [ ] Sprites alpha sem bordas brancas/pretas ou sombras cortadas.
- [ ] Props recompostos sobrepõem visualmente as posições de origem.
- [ ] Nenhum personagem duplicado no runtime; repetições no concept são referências do percurso, não NPCs automáticos.
- [ ] Ponte atravessável somente em zona permitida; rio bloqueia fora da travessia.
- [ ] Oclusão do personagem validada nos pés e não pela cabeça.

## 5. Diretórios finais no projeto

```text
public/assets/world/forest/
├── source/                     # fonte bloqueada; não servir em produção
├── common/
│   ├── props/                  # tent, campfire_ring, bridge, logs, packs
│   ├── vegetation/             # pine, leafy_tree, fern, flower, bush
│   ├── rocks/
│   └── characters/explorer/    # spritesheets e atlas
├── scenes/
│   ├── night/
│   │   ├── background/         # sky, distant, ground_clean
│   │   ├── layers/             # terrain, river, occluders
│   │   ├── sprites/            # variantes específicas
│   │   ├── masks/              # water, walkable, depth (se raster)
│   │   ├── fx/
│   │   └── scene.json
│   ├── rain/
│   ├── snow/
│   ├── day_golden/
│   ├── sunset/
│   ├── day_forest/
│   └── mist/
└── atlases/                   # atlas + metadados JSON
```

Produção editável fora de `public`: `art-source/forest/*.psd` ou `.ora` + máscaras RGBA e manifests.

## 6. Contrato de mapa JSON v1.0

Arquivos: `schemas/scene.schema.json` e `scenes/*.json`.

**Sistema de coordenadas:** `(0,0)` canto superior esquerdo da imagem virtual 941×1672, `x` à direita, `y` para baixo. Âncoras de sprites por padrão `bottom-center` (pés); a imagem possui `anchor` explícito. Escala de viewport aplicada pelo runtime, nunca embutida no arquivo de mapa.

**Campos principais:**

- `schemaVersion`, `sceneId`: versão e identificador.
- `source`: filename, dimensões e hash da arte gabarito.
- `world`: dimensões e projeção ilustrada.
- `render.layers[]`: `{id,kind,asset,z,parallax}` com paths relativos ao pack.
- `render.sortPolicy`: grupos fixos + `footY` para objetos dinâmicos, com oclusores em grupo separado.
- `objects[]`: `{id,asset,x,y,anchor,depthGroup,collision,interactive?,interactionId?}`.
- `spawns[]`: pontos nomeados; vazio até validação.
- `navigation`: polígonos navegáveis, bloqueios e conexões de ponte.
- `occluders[]`: objetos/máscaras frontais usados para ocultar player.
- `effects[]`: efeito e parâmetros por clima. Máscaras opcionais.
- `audit`: flags de verificação e registro de pendências.

**Importante:** o JSON schema valida estrutura/tipos, mas **não garante** geometria navegável, existência de PNG/WebP nem paridade. Esses testes são separados.

## 7. Regras de renderização 2.5D

- `sky/far`: parallax menor que 1 apenas para cenas com folga lateral; sem folga, manter 1 para evitar bordas vazias.
- `base/terrain`: parallax 1, fixo em coordenadas de mundo.
- `dynamic-y`: profundidade pela base/posição dos pés; usar `depthGroup` e offsets manuais para pontes, elevações e galhos.
- `occlusion`: recorte de copa/galho frontal como layer, collider só no tronco.
- `effects`: particle emitters em camadas de distância; chuva/neve atrás e na frente do personagem quando apropriado.
- `water`: base visível + máscara + textura animada opcional, sem extrapolar fluxo apenas da arte.

## 8. Checklist executável por sprint

### Sprint 0 — Inventário e baseline
- [ ] Congelar hash das sete fontes e organizar identificadores.
- [ ] Inventariar cada elemento com bounding boxes e duplicações.
- [ ] Selecionar `day_forest` como piloto, sujeito a confirmação após auditoria.
- [ ] Definir resolução interna + safe area de UI real (sem adivinhar pixels).
- **Gate:** manifest, inventário visual e plano de cenas aprovados.

### Sprint 1 — Extração do piloto
- [ ] Remover personagens e reconstruir fundo do piloto.
- [ ] Separar barraca, fogueira, troncos, ponte, árvores frontais e rochas críticas.
- [ ] Exportar RGBA e conferir composição com render original.
- **Gate:** recomposto visualmente fiel, sem halos/fantasmas.

### Sprint 2 — Geometria / runtime
- [ ] Desenhar polígonos walkable/collision com ferramenta visual.
- [ ] Marcar spawn real, travessia e bloqueios do rio.
- [ ] Integrar player externo, ordenação `footY`, câmera e parallax.
- [ ] Validar áreas de oclusão em dispositivos verticais.
- **Gate:** percurso piloto completo, sem clipping/softlock.

### Sprint 3 — Kit compartilhado
- [ ] Consolidar variações de barraca, árvore, pedra, tronco e flora.
- [ ] Criar atlas reutilizáveis; medir memória e tamanho real.
- [ ] Separar assets que não têm consistência de perspectiva/iluminação.
- **Gate:** biblioteca sem reaproveitamentos visualmente incoerentes.

### Sprint 4 — Seis cenas derivadas
- [ ] Extrair fundo, sprites e máscaras de `night`, `rain`, `snow`, `day_golden`, `sunset`, `mist`.
- [ ] Marcar navegação para cada composição (não copiar polígonos sem prova de alinhamento).
- [ ] Produzir variações de clima, iluminação e terreno.
- **Gate:** sete cenas independentes reproduzíveis.

### Sprint 5 — FX / mobile QA
- [ ] Implementar chuva, neve, neblina, fogo, água e iluminação em camadas.
- [ ] Testar viewport 360×800, 390×844 e 430×932 (CSS px) e DPR real.
- [ ] Perfilar renderização, memória, download e troca entre cenas.
- [ ] Definir orçamento de performance por dispositivo com métricas medidas.
- **Gate:** QA funcional, visual e de desempenho documentado.

## 9. Matriz de QA / validação cruzada

| Teste | Método | Aceite |
|---|---|---|
| Fonte | SHA-256 e dimensões | correspondência exata com manifest |
| Raster | sobrepor original/recomposto | sem deslocamento de objetos e sem falhas perceptíveis |
| Alpha | inspeção em fundo claro e escuro | sem halos e clipping |
| Colisão | caminhada manual + teste programático | sem atravessar bloqueios |
| Trilha | percorrer spawns até saída | sem softlocks |
| Ponte | atravessar pelas extremidades | livre sobre ponte, bloqueio nas margens |
| Oclusão | passar atrás/à frente de cada tronco | ordem correta |
| Viewports | capturas com safe area | sem stretch nem UI sobre player |
| Performance | profiling real | aprovado segundo metas mensuradas |
| Integridade | scan JSON + paths + hashes | nenhuma referência quebrada |

## 10. Handoff

**Resultado obtido:** fontes verificadas, inventário-alvo, convenções, sete templates JSON, schema JSON e roadmap de execução.

**Arquivos criados:** `PLANO_OPERACIONAL.md`, `source-manifest.json`, `schemas/scene.schema.json` e `scenes/*.json`.

**Paridade realizada:** hashes/dimensões verificadas; **não** foram realizadas extração de pixels, comparação visual de camadas, auditoria de colisões ou testes de jogo.

**Pendências:** confirmar engine/runtime e implementar extração real; mapear coordenadas com editor visual; criar spritesheets do personagem; validar no device.
