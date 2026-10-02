# 🐍 Neo Snake Arcade - Jogo da Cobrinha

Um jogo da cobrinha (Snake) moderno e dinâmico no estilo arcade cyberpunk neon, jogável com as setinhas do teclado, sons interativos sintetizados via Web Audio API e publicado na Vercel!

---

## 🚀 Jogue Agora na Vercel

O jogo já está publicado e ativo na Vercel:
👉 **[Jogar Neo Snake na Vercel](https://temporary-fleet-cove-ghhjefp.vercel.app)**

> 💡 **Reivindicar projeto permanente:** Você pode vincular este deploy permanentemente à sua conta da Vercel pelo link:
> [Reivindicar Projeto na Vercel](https://vercel.com/claim-deployment?code=395c99f2-c919-415f-9516-e04c6f179325)

---

## 🎮 Controles

| Tecla / Botão | Ação |
| :--- | :--- |
| **⬆ ⬇ ⬅ ➡ (Setinhas)** | Mover a cobrinha nas 4 direções |
| **W, A, S, D** | Alternativa para movimentação |
| **Espaço** ou **P** | Pausar / Continuar jogo |
| **M** | Ativar / Desativar efeitos sonoros |
| **Botões Virtuais na Tela** | Suporte a toque para dispositivos móveis ou cliques com mouse |

---

## 🔊 Sons Interativos (100% Web Audio API)

Não depende de arquivos externos ou servidores de áudio. Todos os sons são gerados de forma procedural e sem latência:
- **Movimento e Curvas:** Efeito tátil de clique suave a cada comando das setinhas.
- **Comer Fruta Neon:** Sino arcade brilhante com pitch que sobe conforme o combo.
- **Combo Multiplier:** Fanfarra especial ao manter o ritmo e comer frutas consecutivas.
- **Maçã Dourada Bônus:** Arpeggio harmônico cintilante com anel temporizador de contagem regressiva.
- **Fim de Jogo (Game Over):** Distorção dramática descendente com ruído de impacto e explosão de partículas.
- **Música Synthwave Opcional:** Trilha sonora retro chiptune com linha de baixo em sintetizador A-minor (botão `🎵`).

---

## ✨ Recursos & Design

- **Visual Cyber Neon:** Interface escura com brilhos pulsantes, scanlines sutis e gradientes de cores dinâmicas.
- **Visualizador de Teclas:** As setinhas do teclado acendem na tela em tempo real quando você aperta no seu teclado físico.
- **Sistema de Partículas:** Explosões luminosas a cada fruta comida e estilhaços ao bater.
- **Dificuldade Ajustável:** Modos Fácil, Normal e Insano.
- **Persistência de Recorde:** Guarda o maior recorde no navegador (`localStorage`).
- **Pronto para Deploy na Vercel:** Contém arquivo `vercel.json` configurado.

---

## 💻 Como Rodar Localmente

Se preferir rodar localmente no seu computador:

1. Abra a pasta do projeto:
   ```powershell
   cd C:\Users\Lowx\.gemini\antigravity-ide\scratch\snake-game
   ```
2. Abra o arquivo `index.html` em qualquer navegador moderno, ou execute:
   ```bash
   npx serve .
   ```
