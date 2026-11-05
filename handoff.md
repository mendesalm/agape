# Handoff Técnico — e-Sigma Ágape (Bar, Consumação e Estoque)

**Data de Atualização:** 05/11/2026  
**Status do Projeto:** 100% Concluído e Sincronizado (`origin/main`)  
**Últimos Commits no Ágape:**
- `410c976`: *feat(cliente): implementa Portal do Cliente com 4 modulos táteis (cadastro, faturas, crédito e pagamentos)*
- `ba7e619`: *chore(scripts): adiciona utilitários de sandbox de produtos e dados de teste*
- `4a42182`: *feat(gerente): implementa painéis Gerente Financeiro e Gerente Logística em Tactile Velocity*
- `ff031bf`: *feat(pdv): refatora tela de Comandas/Balcão para o design system Tactile Velocity*

---

## 1. Visão Geral da Arquitetura em 3 Macro-Níveis

O aplicativo **e-Sigma Ágape** (`https://agape.e-sigma.app`) foi formalmente reestruturado em **3 Níveis de Acesso e Experiência (Personas)**, unificados pela nova linguagem de design tátil **Tactile Velocity** (baseada no Google Stitch):

```
                                  E-SIGMA ÁGAPE
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
  [NÍVEL GERENTE]               [NÍVEL VENDEDOR]               [NÍVEL CLIENTE]
  • /app/financeiro             • /app/comandas                • /app/cliente
  • /app/logistica              • Balcão & Salão               • Portal do Obreiro
```

---

## 2. Detalhamento dos Módulos Entregues

### A. Nível GERENTE

1. **Submenu Financeiro (`/app/financeiro` — `GerenteFinanceiro.tsx`):**
   - **4 KPIs Táteis:** Faturamento Bruto da Noite, Lucro Líquido do Bar, Inadimplência Total e Ticket Médio por Irmão.
   - **5 Tiles Simétricos de Arrecadação:** Separação precisa por forma de pagamento (Pix, Cartão de Débito, Cartão de Crédito, Dinheiro e Saldo Bar/Fiado).
   - **3 Abas Operacionais:**
     - *Extrato de Vendas:* Histórico de transações com filtros e valores.
     - *Irmãos Devedores:* Lista de débitos pendentes com dados de contato (WhatsApp/telefone) e botão `[ 📋 Copiar Cobrança Pix ]` com chave dinâmica pronta.
     - *Fechamento / Gaveta de Caixa:* Conciliação física entre valor contado em espécie na gaveta e valor do sistema, registrando sobras ou quebras com justificativa e assinatura digital do operador.
   - **Backend:** `GET /financeiro/resumo` enriquecido com cálculo de inadimplência e lista detalhada de devedores.

2. **Submenu Logística (`/app/logistica` — `GerenteLogistica.tsx`):**
   - **Controle de Estoque em 2 Níveis:** Separação física clara entre estoque no **Armazém/Depósito Central** e estoque exposto na **Gôndola/Display do Balcão**.
   - **Alertas de Reposição e Validade FEFO:** Identificação visual prioritária de itens com validade próxima (FEFO - *First Expire, First Out*) e estoque abaixo do mínimo.
   - **Modais Táteis Especializados:**
     - *Transferência para Gôndola:* Abastecimento do balcão retirando do armazém.
     - *Cadastro Rápido de Produto:* Criação com categorias, código de barras e QR Tag.
     - *Registro de Perda/Quebra:* Classificação de descarte com dedução automática de custo no caixa do bar.
     - *Entrada de Lote FEFO:* Cadastro de novos lotes com data de validade auditável.
     - *Etiqueta QR Code:* Pré-visualização e impressão de etiquetas térmicas para identificação de produtos.

---

### B. Nível VENDEDOR (Módulo Salão — `/app/comandas` — `Comandas.tsx`)

- **3 Pilares de Atendimento:**
  1. *Recepção:* Cadastrar novo cliente / visitante e associar cartão físico coringa (RFID / QR Code).
  2. *Balcão:* Bipagem ágil com câmera contínua (`PdvMobileScannerModal.tsx`), conferência tátil com atalhos `+1, +2, +5, +10`, e botão `[ ↶ Anular ]` com estorno imediato de itens lançados acidentalmente.
  3. *Caixa / Check-out:* Fechamento rápido (`FecharComandaModal.tsx`) com 3 tiles simétricos (`PIX`, `Cartão / POS`, `Dinheiro`), QR Code Pix com temporizador regressivo (`⏱ 05:00`) e opção integrada `[✓] Devolver e Liberar Cartão Físico`.
- **Identificação pelo Nome do Irmão:**
  - Avatar tipográfico com iniciais (foto de perfil opcional, nunca obrigatória).
  - Busca rápida em 3 tiles simétricos (`CPF`, `CIM`, `NOME/CARTÃO`).

---

### C. Nível CLIENTE (Portal do Obreiro — `/app/cliente` — `PortalCliente.tsx`)

- **Hero Bar de Telemetria:**
  - Saldo disponível na conta do Bar (esmeralda se positivo, âmbar se zerado).
  - Cartão físico atualmente vinculado (`CARTAO-XX`).
  - Total de consumo na comanda da noite.
- **Navegação Simétrica nas 4 Opções do Irmão:**
  1. **📋 Cadastro:** Visualização dos dados maçônicos e formulário instantâneo para edição de WhatsApp/celular (usado no envio automático de faturas) e e-mail.
  2. **📑 Relatório (Faturas):** Histórico de comandas de sessões anteriores com detalhamento item a item e botão `[ 🖨 Ver Cupom Térmico ]` (`ComprovanteTermicoModal.tsx`).
  3. **💳 Crédito (Inserção de Saldos):** Saldo atual e atalhos rápidos (`R$ 20`, `R$ 50`, `R$ 100`, `R$ 200` ou valor personalizado) com geração dinâmica de QR Code Pix e Copia e Cola.
  4. **⚡ Pagamentos (Quitação da Noite & Auto-checkout):**
     - Se houver comanda aberta: exibição dos itens consumidos e botão de pagamento direto via Pix no celular ou débito imediato do saldo da carteira do bar, incluindo devolução/desvinculação do cartão físico.
     - Se não houver pendências: card tátil em esmeralda confirmando que a conta está 100% liquidada.

---

## 3. Diretrizes de Design Aplicadas (Tactile Velocity)

- **Paleta de Cores:**
  - Fundo Obsidian: `#0B1326`
  - Superfícies Elevadas: `#131B2E`, `#171F33`, `#1E293B`
  - Bordas Sólidas: `#334155`
  - Ação / Sucesso: Esmeralda `#10B981` / `#4EDEA3`
  - Atenção / FEFO: Âmbar `#F59E0B` / `#FFB95F`
  - Telemetria / Financeiro: Ciano `#38BDF8` / `#7BD0FF`
  - **Purple Ban:** Zero tons de roxo/violeta no CSS e componentes.
- **Identificação:** Prioridade absoluta ao Nome do Irmão (`Ir.'. {nome}`) e CIM maçônico.
- **Ergonomia Móvel:** Alvos de toque generosos (`min-h-[44px]` a `min-h-[48px]`), fontes de alto contraste e otimização para economia de bateria em telas AMOLED.

---

## 4. Portas e Processos em Execução no Ambiente de Desenvolvimento

| Serviço | Diretório | Comando / Descrição | URL / Acesso |
| :--- | :--- | :--- | :--- |
| **Agape Frontend (Vite)** | `c:\Users\engan\Desktop\Agape\frontend` | `npm run dev` (HTTPS ativo) | `https://localhost:5179` / `https://192.168.77.43:5179` |
| **Agape Backend (FastAPI)** | `c:\Users\engan\Desktop\Agape\backend` | `python -m uvicorn app.main:app --host 0.0.0.0 --port 8007` | `http://localhost:8007` / Swagger: `/docs` |

---

## 5. Próximos Passos Recomendados para a Próxima Sessão

1. **Testes de Campo em Dispositivos Móveis:**
   - Acessar `https://192.168.77.43:5179/app/cliente` em um smartphone na rede local para validar a experiência tátil da quitação e recarga Pix.
2. **Webhook Real de Baixa de Pix (Opcional):**
   - Conectar o webhook do gateway bancário (ex: Mercado Pago, Efí/Gerencianet ou Asaas) para confirmação automática em tempo real via WebSocket na tela do cliente.
3. **Refinamento de Notificações WhatsApp:**
   - Adicionar disparo de mensagem amigável via Baileys/Evolution API com o extrato térmico assim que o irmão realiza o auto-checkout.
